import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.NOTIFICATIONS_PORT || 4006;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notifications-node' }));

// ============================================
// GET NOTIFICATIONS
// ============================================
app.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const where = {};
    if (userId) where.userId = userId;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ============================================
// CREATE NOTIFICATION (Admin/Direction)
// ============================================
app.post(
  '/',
  requireAuth,
  requireRole('admin', 'direction'),
  [
    body('userId').optional().isString(),
    body('type').isIn(['application_status', 'payment_reminder', 'enrollment_update', 'general', 'urgent']),
    body('title').isString().isLength({ min: 2 }),
    body('message').isString().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid notification payload' });
      }

      const notification = await prisma.notification.create({
        data: req.body,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
);

// ============================================
// CREATE NOTIFICATION (Public - for system events)
// ============================================
app.post('/system', [
  body('userId').optional().isString(),
  body('type').isIn(['application_status', 'payment_reminder', 'enrollment_update', 'general', 'urgent']),
  body('title').isString().isLength({ min: 2 }),
  body('message').isString().isLength({ min: 2 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid notification payload' });
    }

    const notification = await prisma.notification.create({
      data: req.body,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create system notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ============================================
// BULK CREATE NOTIFICATIONS
// ============================================
app.post('/bulk', requireAuth, requireRole('admin', 'direction'), async (req, res) => {
  try {
    const { notifications } = req.body;
    if (!Array.isArray(notifications)) {
      return res.status(400).json({ error: 'notifications must be an array' });
    }

    const created = await prisma.notification.createMany({
      data: notifications,
    });

    res.status(201).json({ count: created.count, message: `${created.count} notifications created` });
  } catch (error) {
    console.error('Bulk create notifications error:', error);
    res.status(500).json({ error: 'Failed to create notifications' });
  }
});

// ============================================
// GET UNREAD COUNT
// ============================================
app.get('/unread-count', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ============================================
// MARK ALL AS READ
// ============================================
app.patch('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({ count: result.count, message: `${result.count} notifications marked as read` });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// ============================================
// MARK AS READ
// ============================================
app.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ============================================
// DELETE NOTIFICATION
// ============================================
app.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Notifications microservice listening on http://localhost:${PORT}`);
});
