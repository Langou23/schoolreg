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
const PORT = process.env.CLASSES_PORT || 4005;
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'classes-node' }));

// ============================================
// GET ALL CLASSES
// ============================================
app.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { enrollments: true },
    });
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// ============================================
// GET CLASS BY ID
// ============================================
app.get('/classes/:id', async (req, res) => {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: { enrollments: true },
    });
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// ============================================
// CREATE CLASS
// ============================================
app.post(
  '/classes',
  requireAuth,
  requireRole('admin', 'direction'),
  [
    body('name').isString().isLength({ min: 2 }),
    body('level').isString().notEmpty(),
    body('capacity').isInt({ min: 1 }),
    body('session').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid class payload' });
      }

      const classData = await prisma.class.create({
        data: req.body,
      });

      res.status(201).json(classData);
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ error: 'Failed to create class' });
    }
  }
);

// ============================================
// UPDATE CLASS
// ============================================
app.put(
  '/classes/:id',
  requireAuth,
  requireRole('admin', 'direction'),
  async (req, res) => {
    try {
      const classData = await prisma.class.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json(classData);
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ error: 'Failed to update class' });
    }
  }
);

// ============================================
// DELETE CLASS
// ============================================
app.delete(
  '/classes/:id',
  requireAuth,
  requireRole('admin', 'direction'),
  async (req, res) => {
    try {
      await prisma.class.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({ error: 'Failed to delete class' });
    }
  }
);

app.listen(PORT, () => {
  console.log(`✅ Classes microservice listening on http://localhost:${PORT}`);
});
