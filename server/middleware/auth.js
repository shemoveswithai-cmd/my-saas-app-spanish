import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

export function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireSubscription(req, res, next) {
  const subscription = db.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ? AND status = ?'
  ).get(req.user.id, 'active');

  // Admins bypass subscription check
  if (req.user.is_admin) {
    req.subscription = { status: 'active', plan: 'admin' };
    return next();
  }

  if (!subscription) {
    return res.status(403).json({ 
      error: 'Active subscription required',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  req.subscription = subscription;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
