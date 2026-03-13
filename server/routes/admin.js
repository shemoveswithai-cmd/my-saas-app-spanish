import express from 'express';
import db from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users with subscription status
router.get('/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.is_admin,
        u.created_at,
        s.status as subscription_status,
        s.plan,
        s.current_period_end,
        s.cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get dashboard stats
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeSubscriptions = db.prepare(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"
    ).get().count;
    const cancelledSubscriptions = db.prepare(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled'"
    ).get().count;

    // Recent signups (last 30 days)
    const recentSignups = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at > datetime('now', '-30 days')
    `).get().count;

    res.json({
      totalUsers,
      activeSubscriptions,
      cancelledSubscriptions,
      recentSignups
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Toggle admin status
router.post('/users/:userId/toggle-admin', authenticate, requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent self-demotion
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own admin status' });
    }

    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = user.is_admin ? 0 : 1;
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newStatus, userId);

    res.json({ success: true, isAdmin: !!newStatus });
  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

export default router;
