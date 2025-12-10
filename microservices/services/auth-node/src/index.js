/**
 * ============================================
 * SERVICE D'AUTHENTIFICATION (auth-node)
 * ============================================
 * 
 * Ce service gère toute l'authentification de SchoolReg:
 * - Inscription des nouveaux utilisateurs (parents, élèves)
 * - Connexion avec email/mot de passe
 * - Génération et vérification des tokens JWT
 * - Protection contre les créations de comptes admin non autorisées
 * 
 * Port par défaut: 4001
 * Base de données: PostgreSQL via Prisma ORM
 * ============================================
 */

// ============================================
// IMPORTATIONS DES DÉPENDANCES
// ============================================

import express from 'express';              // Framework web Node.js
import cors from 'cors';                    // Gestion des requêtes cross-origin (frontend -> backend)
import dotenv from 'dotenv';                // Chargement des variables d'environnement depuis .env
import path from 'path';                    // Manipulation des chemins de fichiers
import { fileURLToPath } from 'url';        // Conversion URL -> chemin fichier (pour ES modules)
import { PrismaClient } from '@prisma/client';  // ORM pour accéder à la base de données
import bcrypt from 'bcryptjs';              // Hachage sécurisé des mots de passe
import jwt from 'jsonwebtoken';             // Génération et vérification des tokens JWT
import { body, validationResult } from 'express-validator';  // Validation des données entrantes

// ============================================
// CONFIGURATION DE L'APPLICATION
// ============================================

// Obtenir le chemin du fichier actuel (nécessaire en ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le fichier .env depuis la racine du projet (4 niveaux au-dessus)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Initialiser Prisma Client pour accéder à la base de données PostgreSQL
const prisma = new PrismaClient();

// Créer l'application Express
const app = express();

// Définir le port du service (4001 par défaut)
const PORT = process.env.AUTH_PORT || 4001;

// Clé secrète pour signer les tokens JWT (CRITIQUE: doit être sécurisée en production)
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Durée de validité des tokens (7 jours par défaut)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Activer CORS pour permettre les requêtes du frontend (localhost:5174)
// origin: true = accepter toutes les origines (à restreindre en production)
// credentials: true = autoriser l'envoi de cookies
app.use(cors({ origin: true, credentials: true }));

// Parser automatiquement le JSON des requêtes entrantes
app.use(express.json());

// ============================================
// ENDPOINT DE SANTÉ (HEALTH CHECK)
// ============================================

/**
 * GET /health
 * 
 * Vérifie que le service est opérationnel.
 * Utilisé par le monitoring et les tests de connectivité.
 * 
 * Réponse: { status: 'ok', service: 'auth-node' }
 */
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-node' }));

// ============================================
// INSCRIPTION (SIGN UP)
// ============================================

/**
 * POST /api/auth/signup
 * 
 * Permet à un nouvel utilisateur de créer un compte.
 * IMPORTANT: Seuls les rôles 'parent' et 'student' sont autorisés.
 * Les comptes admin/direction doivent être créés via script sécurisé.
 * 
 * Corps de la requête:
 * {
 *   email: string,      // Email valide (unique)
 *   password: string,   // Min 6 caractères
 *   fullName: string,   // Nom complet (min 3 caractères)
 *   role: string        // 'parent' ou 'student' uniquement
 * }
 * 
 * Réponse (201):
 * {
 *   message: 'User created successfully',
 *   user: { id, email, fullName, role, studentId, createdAt },
 *   token: 'JWT_TOKEN'  // Token d'authentification automatique
 * }
 */
app.post(
  '/api/auth/signup',
  [
    // Validations des champs avec express-validator
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
    // SÉCURITÉ: N'autoriser que les rôles parent ou student lors de l'inscription publique
    body('role').isIn(['parent', 'student']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      // 1. VALIDATION: Vérifier que toutes les données sont valides
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Retourner la première erreur trouvée
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password, fullName, role } = req.body;

      // 2. SÉCURITÉ: Double vérification pour bloquer les inscriptions admin/direction
      // Protection contre les tentatives de contournement de la validation
      if (['admin', 'direction'].includes(role)) {
        return res.status(403).json({ error: 'Admin/Direction sign-up not allowed via this endpoint' });
      }

      // 3. UNICITÉ: Vérifier que l'email n'est pas déjà utilisé
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // 4. SÉCURITÉ: Hacher le mot de passe avec bcrypt (10 rounds de salage)
      // Le mot de passe n'est JAMAIS stocké en clair dans la base de données
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. CRÉATION: Insérer le nouvel utilisateur dans la base de données
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,  // Mot de passe haché
          fullName,
          role,
        },
        // Ne retourner que les champs nécessaires (pas le mot de passe)
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          studentId: true,
          createdAt: true,
        },
      });

      // 6. AUTHENTIFICATION: Générer un token JWT pour connecter automatiquement l'utilisateur
      // Le token contient: userId, email, role + expire dans 7 jours
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },  // Payload (données)
        JWT_SECRET,                                                // Clé de signature
        { expiresIn: JWT_EXPIRES_IN }                             // Expiration (7j)
      );

      // 7. SUCCÈS: Retourner l'utilisateur créé + le token
      res.status(201).json({
        message: 'User created successfully',
        user,    // Informations utilisateur (sans mot de passe)
        token,   // Token JWT pour les prochaines requêtes authentifiées
      });
    } catch (error) {
      // Gestion des erreurs inattendues (problème DB, etc.)
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// ============================================
// CONNEXION (SIGN IN)
// ============================================

/**
 * POST /api/auth/signin
 * 
 * Permet à un utilisateur existant de se connecter avec email + mot de passe.
 * Si les identifiants sont corrects, retourne un token JWT pour l'authentification.
 * 
 * Corps de la requête:
 * {
 *   email: string,     // Email du compte
 *   password: string   // Mot de passe en clair (sera vérifié avec le hash)
 * }
 * 
 * Réponse (200):
 * {
 *   message: 'Login successful',
 *   user: { id, email, fullName, role, studentId, student: {...} },
 *   token: 'JWT_TOKEN'  // Token d'authentification
 * }
 * 
 * Erreurs possibles:
 * - 400: Données invalides
 * - 401: Email ou mot de passe incorrect
 * - 500: Erreur serveur
 */
app.post(
  '/api/auth/signin',
  [
    // Validations
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      // 1. VALIDATION: Vérifier le format des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // 2. RECHERCHE: Chercher l'utilisateur par email
      // include: { student: true } = inclure les données élève si disponibles
      const user = await prisma.user.findUnique({
        where: { email },
        include: { student: true },  // Charger les infos élève (si user.role === 'student')
      });

      // SÉCURITÉ: Ne pas révéler si l'email existe ou non
      // Même message d'erreur si email inexistant OU mot de passe incorrect
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // 3. VÉRIFICATION: Comparer le mot de passe fourni avec le hash en base
      // bcrypt.compare() hache le password et le compare au user.password (haché)
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Même message d'erreur pour ne pas révéler que l'email existe
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // 4. AUTHENTIFICATION: Générer un token JWT valide pour 7 jours
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 5. NETTOYAGE: Retirer le mot de passe de la réponse (sécurité)
      // Destructuration pour extraire password et garder le reste
      const { password: _, ...userWithoutPassword } = user;

      // 6. SUCCÈS: Retourner les infos utilisateur + token
      res.json({
        message: 'Login successful',
        user: userWithoutPassword,  // Toutes les infos SAUF le mot de passe
        token,                      // Token JWT pour les requêtes authentifiées
      });
    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({ error: 'Failed to sign in' });
    }
  }
);

// ============================================
// RÉCUPÉRER L'UTILISATEUR CONNECTÉ (GET ME)
// ============================================

/**
 * GET /api/auth/me
 * 
 * Retourne les informations de l'utilisateur actuellement connecté
 * en décodant son token JWT.
 * 
 * Headers requis:
 *   Authorization: Bearer <JWT_TOKEN>
 * 
 * Réponse (200):
 * {
 *   user: { id, email, fullName, role, studentId, createdAt }
 * }
 * 
 * Erreurs:
 * - 401: Token manquant, invalide ou expiré
 * - 404: Utilisateur introuvable (token valide mais user supprimé)
 */
app.get('/api/auth/me', async (req, res) => {
  try {
    // 1. EXTRACTION: Récupérer le header Authorization
    const authHeader = req.headers.authorization;

    // 2. VALIDATION: Vérifier le format "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 3. PARSING: Extraire le token (enlever "Bearer ")
    // substring(7) = sauter les 7 premiers caractères "Bearer "
    const token = authHeader.substring(7);

    // 4. VÉRIFICATION: Décoder et vérifier le token JWT
    // jwt.verify() lève une exception si:
    // - Token invalide (signature incorrecte)
    // - Token expiré
    // - Token malformé
    const decoded = jwt.verify(token, JWT_SECRET);
    // decoded contient: { userId, email, role, iat, exp }

    // 5. RECHERCHE: Chercher l'utilisateur par son ID extrait du token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      // Ne retourner que les champs publics (pas le mot de passe)
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        createdAt: true,
      },
    });

    // 6. VALIDATION: Vérifier que l'utilisateur existe toujours
    // (Cas rare: token valide mais utilisateur supprimé)
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 7. SUCCÈS: Retourner les informations utilisateur
    res.json({ user });
  } catch (error) {
    // Gestion des erreurs JWT (token invalide, expiré, etc.)
    console.error('Get current user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

/**
 * Démarre le serveur Express sur le port configuré (4001 par défaut).
 * 
 * Le service est maintenant prêt à:
 * - Créer de nouveaux comptes (POST /api/auth/signup)
 * - Connecter des utilisateurs (POST /api/auth/signin)
 * - Vérifier l'identité (GET /api/auth/me)
 * - Vérifier la santé du service (GET /health)
 */
app.listen(PORT, () => {
  console.log(`✅ Auth microservice listening on http://localhost:${PORT}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   - POST /api/auth/signup    (Créer un compte)`);
  console.log(`   - POST /api/auth/signin    (Se connecter)`);
  console.log(`   - GET  /api/auth/me        (Infos utilisateur)`);
  console.log(`   - GET  /health             (Health check)`);
});
