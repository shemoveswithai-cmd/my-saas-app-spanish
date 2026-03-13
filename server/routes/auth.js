import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.SESSION_EXPIRY || '7d' });
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Helper to set auth cookie with proper settings for production
function setAuthCookie(res, token, req) {
  const isProduction = process.env.NODE_ENV === 'production';
  // In production behind Railway proxy, req.secure will be true due to trust proxy
  const isSecure = isProduction || req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax', // 'none' required for cross-site cookies with secure
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Sign up with email/password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const isAdmin = isAdminEmail(email) ? 1 : 0;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name || email.split('@')[0], isAdmin);

    // Create inactive subscription record
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, status)
      VALUES (?, ?, 'inactive')
    `).run(uuidv4(), userId);

    const token = generateToken(userId);
    setAuthCookie(res, token, req);

    res.json({ 
      user: { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0], isAdmin: !!isAdmin },
      token 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login with email/password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token, req);

    const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        avatarUrl: user.avatar_url,
        isAdmin: !!user.is_admin
      },
      subscription: subscription ? { status: subscription.status } : null,
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email.toLowerCase());

    if (!user) {
      // Create new user
      const userId = uuidv4();
      const isAdmin = isAdminEmail(email) ? 1 : 0;

      db.prepare(`
        INSERT INTO users (id, email, name, avatar_url, google_id, is_admin)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, email.toLowerCase(), name, picture, googleId, isAdmin);

      // Create inactive subscription
      db.prepare(`
        INSERT INTO subscriptions (id, user_id, status)
        VALUES (?, ?, 'inactive')
      `).run(uuidv4(), userId);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (!user.google_id) {
      // Link Google account to existing email user
      db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
        .run(googleId, picture, user.id);
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token, req);

    const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        avatarUrl: user.avatar_url || picture,
        isAdmin: !!user.is_admin
      },
      subscription: subscription ? { status: subscription.status } : null,
      token 
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatar_url,
      isAdmin: !!req.user.is_admin,
      preferredLanguage: req.user.preferred_language || 'en'
    },
    subscription: subscription ? {
      status: subscription.status,
      plan: subscription.plan,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: !!subscription.cancel_at_period_end
    } : null
  });
});

// Update language preference
router.post('/update-language', authenticate, (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language || !['en', 'es'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Supported: en, es' });
    }

    db.prepare('UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(language, req.user.id);

    res.json({ success: true, language });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Failed to update language preference' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/'
  });
  res.json({ success: true });
});

export default router;
