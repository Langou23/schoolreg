/**
 * ============================================
 * SERVICE DE GESTION DES CLASSES (classes-node)
 * ============================================
 * Port: 4005 | Node.js + Express + Prisma
 * 
 * Responsabilités:
 * - Création et gestion des classes (primaire, secondaire)
 * - Configuration capacité, niveau, session
 * - Gestion des inscriptions d'élèves aux classes
 * - CRUD complet (Create, Read, Update, Delete)
 * 
 * Structure d'une classe:
 * - name: Nom de la classe (ex: "Mathématiques 5e")
 * - level: Niveau (primaire, secondaire, pré-maternelle)
 * - capacity: Nombre max d'élèves
 * - session: Session scolaire (Automne 2024, Hiver 2025)
 * - teacher: Enseignant responsable (optionnel)
 * ============================================
 */

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

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const prisma = new PrismaClient();
const app = express();

// Configuration
const PORT = process.env.CLASSES_PORT || 4005;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ============================================
// MIDDLEWARES D'AUTHENTIFICATION
// ============================================

/**
 * Vérifie le token JWT de la requête
 * Extrait les infos utilisateur {userId, email, role}
 */
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

/**
 * Middleware qui exige un ou plusieurs rôles spécifiques
 * Usage: app.post('/route', requireAuth, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'classes-node' }));

// ============================================
// ENDPOINTS API
// ============================================

/**
 * GET /classes - Récupère toutes les classes
 * 
 * Retourne: Liste de toutes les classes avec leurs inscriptions
 * Inclut: Nombre d'élèves inscrits (enrollments)
 * 
 * Utilisé par:
 *   - Frontend admin pour afficher la liste des classes
 *   - Frontend parent/élève pour voir les classes disponibles
 */
app.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { enrollments: true },  // Inclure les inscriptions
    });
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * GET /classes/:id - Récupère une classe spécifique
 * 
 * Params:
 *   - id: UUID de la classe
 * 
 * Retourne: Détails de la classe avec liste des élèves inscrits
 * Erreur 404 si la classe n'existe pas
 */
app.get('/classes/:id', async (req, res) => {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: { enrollments: true },  // Liste des inscriptions
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

/**
 * POST /classes - Crée une nouvelle classe
 * 
 * Authentification: JWT requis
 * Rôles autorisés: admin, direction
 * 
 * Body (requis):
 *   - name: Nom de la classe (min 2 caractères)
 *   - level: Niveau (primaire, secondaire, etc.)
 *   - capacity: Capacité maximale (entier ≥ 1)
 *   - session: Session scolaire (ex: "Automne 2024")
 * 
 * Body (optionnel):
 *   - teacher: Nom de l'enseignant
 *   - schedule: Horaire des cours
 *   - room: Numéro de salle
 */
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

/**
 * PUT /classes/:id - Met à jour une classe existante
 * 
 * Authentification: JWT requis
 * Rôles autorisés: admin, direction
 * 
 * Params:
 *   - id: UUID de la classe
 * 
 * Body: Champs à mettre à jour (partiels autorisés)
 *   - name, level, capacity, session, teacher, etc.
 * 
 * Utilisé pour:
 *   - Modifier la capacité d'une classe
 *   - Changer l'enseignant
 *   - Ajuster l'horaire
 */
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

/**
 * DELETE /classes/:id - Supprime une classe
 * 
 * Authentification: JWT requis
 * Rôles autorisés: admin, direction
 * 
 * Params:
 *   - id: UUID de la classe
 * 
 * Note:
 *   - Les inscriptions associées sont supprimées en cascade (config Prisma)
 *   - Attention: Cette action est irréversible
 * 
 * Erreur si:
 *   - La classe n'existe pas (404)
 *   - La classe a des inscriptions actives (selon config)
 */
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
