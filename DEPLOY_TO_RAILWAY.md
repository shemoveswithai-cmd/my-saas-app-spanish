# 🚀 Railway Deployment Guide - Spanish App

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `my-saas-app-spanish`
3. Make it **Public** or **Private** (your choice)
4. Do NOT initialize with README (we'll push existing code)
5. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repo, run these commands in the terminal:

```bash
cd /home/ubuntu/spanish_app
git remote add origin https://github.com/shemoveswithai-cmd/my-saas-app-spanish.git
git push -u origin main
```

If you get authentication errors, use:
```bash
git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/shemoveswithai-cmd/my-saas-app-spanish.git
git push -u origin main
```

## Step 3: Deploy to Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `shemoveswithai-cmd/my-saas-app-spanish`
5. Railway will automatically detect and deploy

## Step 4: Configure Environment Variables

In Railway dashboard:
1. Click on your web service
2. Go to **Variables** tab
3. Click **"+ New Variable"** or **"Raw Editor"**
4. Copy all variables from `RAILWAY_ENV_VARS.txt` file

**IMPORTANT:** Update `STRIPE_WEBHOOK_SECRET` after setting up Stripe webhook.

## Step 5: Set Up Custom Domain

1. In Railway: Go to **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Enter: `es.crazyaddictiveapp.com`
4. Railway will provide a CNAME record
5. Add the CNAME record to your domain registrar:
   - Type: `CNAME`
   - Name: `es`
   - Value: `<provided by Railway>`

## Step 6: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   - `https://es.crazyaddictiveapp.com/auth/google/callback`
   - (Keep the Railway URL too for testing)

## Step 7: Set Up Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Endpoint URL: `https://es.crazyaddictiveapp.com/webhook/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the **Signing secret**
7. Add to Railway as `STRIPE_WEBHOOK_SECRET`

## Step 8: Verify Deployment

1. Visit: https://es.crazyaddictiveapp.com
2. Test sign up with email
3. Test Google OAuth login
4. Test subscription flow
5. Test AI tools

---

## 🎉 Done!

Your Spanish app should now be live at: **https://es.crazyaddictiveapp.com**
