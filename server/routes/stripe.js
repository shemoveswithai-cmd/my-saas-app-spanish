import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const user = req.user;
    let subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);

    // Get or create Stripe customer
    let customerId = subscription?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;

      if (subscription) {
        db.prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?')
          .run(customerId, user.id);
      } else {
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, stripe_customer_id, status)
          VALUES (?, ?, ?, 'inactive')
        `).run(uuidv4(), user.id, customerId);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/subscription/cancel`,
      metadata: { userId: user.id }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get subscription details
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

        db.prepare(`
          UPDATE subscriptions 
          SET stripe_subscription_id = ?,
              status = 'active',
              current_period_start = ?,
              current_period_end = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_customer_id = ?
        `).run(
          subscriptionId,
          new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          customerId
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        db.prepare(`
          UPDATE subscriptions 
          SET status = ?,
              current_period_start = ?,
              current_period_end = ?,
              cancel_at_period_end = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).run(
          subscription.status === 'active' ? 'active' : 'inactive',
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString(),
          subscription.cancel_at_period_end ? 1 : 0,
          subscription.id
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        db.prepare(`
          UPDATE subscriptions 
          SET status = 'cancelled',
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).run(subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        db.prepare(`
          UPDATE subscriptions 
          SET status = 'past_due',
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).run(subscriptionId);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get subscription status
router.get('/subscription-status', authenticate, (req, res) => {
  const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);

  if (!subscription) {
    return res.json({ status: 'none' });
  }

  res.json({
    status: subscription.status,
    plan: subscription.plan,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end
  });
});

// Create customer portal session (for managing subscription)
router.post('/customer-portal', authenticate, async (req, res) => {
  try {
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);

    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.APP_URL}/account`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Customer portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;
