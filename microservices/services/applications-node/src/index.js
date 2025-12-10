/**
 * ============================================
 * SERVICE DE GESTION DES DEMANDES D'INSCRIPTION
 * ============================================
 * Port: 4002 | Node.js + Express + Prisma
 * 
 * Responsabilités:
 * - Réception et validation des demandes d'inscription
 * - Upload de documents (certificat, photo, bulletins)
 * - Approbation/rejet avec création automatique des comptes
 * - Validation de l'âge selon le programme
 * - Accès par code unique
 * ============================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcrypt';
import axios from 'axios';
import { PrismaClient, Gender, ApplicationStatus, DocumentType } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const prisma = new PrismaClient();
const app = express();

// Configuration
const PORT = process.env.APPLICATIONS_PORT || 4003;
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4006';
const SERVICE_JWT = process.env.SERVICE_JWT;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// ============================================
// MIDDLEWARES ET UTILITAIRES
// ============================================

/**
 * Extrait et vérifie le token JWT de la requête
 * @returns {object|null} Payload du token {userId, role, email} ou null
 */
function getCurrentUser(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware qui exige un ou plusieurs rôles spécifiques
 * Usage: app.post('/route', requireRole('admin', 'direction'), handler)
 * @param {...string} allowedRoles - Rôles autorisés
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = getCurrentUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  };
}

/**
 * Envoie une notification via le service notifications-node
 * Ne bloque jamais le flux principal (erreurs capturées)
 */
async function sendNotification(notificationData) {
  try {
    await axios.post(`${NOTIFICATIONS_URL}/system`, notificationData);
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'applications-node' }));

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Convertit le nom de session en date de début
 * Ex: "Automne 2024" -> 1er septembre 2024
 * Utilisé pour valider l'âge des élèves à l'inscription
 */
function parseSessionStart(session) {
  const s = String(session || '').toLowerCase();
  const m = String(session || '').match(/(20\d{2})/);
  const year = m ? parseInt(m[1], 10) : new Date().getFullYear();
  if (s.includes('automne')) return new Date(year, 8, 1);  // 1er septembre
  if (s.includes('hiver')) return new Date(year, 0, 15);   // 15 janvier
  if (s.includes('été') || s.includes('ete')) return new Date(year, 5, 15); // 15 juin
  return new Date();
}

/**
 * Calcule l'âge d'une personne à une date donnée
 * @param {Date} dob - Date de naissance
 * @param {Date} on - Date de référence
 * @returns {number} Âge en années
 */
function ageOn(dob, on) {
  let age = on.getFullYear() - dob.getFullYear();
  const m = on.getMonth() - dob.getMonth();
  // Ajuster si l'anniversaire n'est pas encore passé
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Normalise et valide les données d'une demande d'inscription
 * Accepte les formats camelCase et snake_case
 * @throws {Error} 'INVALID_DOB' si la date de naissance est invalide
 */
function mapApplicationBody(bodyIn) {
  const b = bodyIn || {};
  
  // Extraire et valider la date de naissance
  const dobRaw = b.dateOfBirth ?? b.date_of_birth;
  const dob = dobRaw ? new Date(dobRaw) : null;
  if (!dob || isNaN(dob.getTime())) {
    throw new Error('INVALID_DOB');
  }
  
  // Mapper tous les champs (support camelCase et snake_case)
  const data = {
    firstName: b.firstName ?? b.first_name,
    lastName: b.lastName ?? b.last_name,
    dateOfBirth: dob,
    gender: b.gender,
    address: b.address,
    parentName: b.parentName ?? b.parent_name,
    parentPhone: b.parentPhone ?? b.parent_phone,
    parentEmail: b.parentEmail ?? b.parent_email,
    program: b.program,
    session: b.session,
    secondaryLevel: b.secondaryLevel ?? b.secondary_level,
    status: b.status,
    notes: b.notes,
  };
  return data;
}

// Upload configuration - shared uploads directory at project root
const projectRoot = path.resolve(__dirname, '../../../../');
const uploadsDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Also expose the uploads statically from this service
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowed.has(file.mimetype)) cb(null, true); else cb(new Error('Invalid file type'));
  },
});

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = `/uploads/${file.filename}`;
  const absUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
  return res.status(201).json({ fileId: file.filename, url: absUrl, relativePath, mimeType: file.mimetype, size: file.size });
});

// ============================================
// ENDPOINTS API
// ============================================

/**
 * GET /applications - Liste les demandes d'inscription
 * 
 * Query params:
 *   - parentEmail: Filtrer par email du parent
 *   - status: Filtrer par statut (pending, approved, rejected)
 * 
 * Retourne: Liste des demandes avec documents et profil élève associé
 */
app.get('/applications', async (req, res) => {
  try {
    const { parentEmail, status } = req.query;
    const where = {};
    if (parentEmail) where.parentEmail = String(parentEmail);
    if (status) where.status = String(status);
    
    const applications = await prisma.application.findMany({
      where,
      include: { documents: true, student: true },
      orderBy: { submittedAt: 'desc' },
    });
    
    res.json(applications);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * POST /applications - Crée une nouvelle demande d'inscription
 * 
 * Validations:
 *   - Tous les champs obligatoires présents
 *   - Date de naissance valide
 *   - Âge conforme au programme (12-17 ans pour le secondaire)
 *   - Enum valides (gender, status)
 * 
 * Processus:
 *   1. Validation des données
 *   2. Vérification de l'âge si programme secondaire
 *   3. Création dans la BD avec statut 'pending'
 */
app.post(
  '/applications',
  [
    body('first_name').optional().isString().isLength({ min: 2 }),
    body('last_name').optional().isString().isLength({ min: 2 }),
    body('date_of_birth').optional().isISO8601(),
    body('gender').isString().notEmpty(),
    body('address').isString().isLength({ min: 5 }),
    body('parent_name').optional().isString().isLength({ min: 3 }),
    body('parent_phone').optional().isString().isLength({ min: 6 }),
    body('parent_email').optional().isEmail(),
    body('program').isString().notEmpty(),
    body('session').isString().notEmpty(),
  ],
  async (req, res) => {
    try {
      // Valider le format des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      // Mapper et valider les données
      let data;
      try {
        data = mapApplicationBody(req.body);
      } catch (e) {
        if (e && e.message === 'INVALID_DOB') return res.status(400).json({ error: 'Invalid or missing dateOfBirth' });
        throw e;
      }

      // Validation spéciale pour le niveau secondaire (12-17 ans)
      const hasSecondary = Boolean(req.body.secondary_level ?? data.secondaryLevel);
      if (hasSecondary) {
        const sessionStr = String(req.body.session ?? data.session ?? '');
        const sessionStart = parseSessionStart(sessionStr);
        const dob = data.dateOfBirth;
        const age = ageOn(dob, sessionStart);
        if (!Number.isFinite(age) || age < 12 || age > 17) {
          return res.status(400).json({ error: 'Âge invalide pour le secondaire (12 à 17 ans) à la date de début de la session' });
        }
      }

      const required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'address', 'parentName', 'parentPhone', 'program', 'session'];
      for (const key of required) {
        if (!data[key]) return res.status(400).json({ error: `Missing field: ${key}` });
      }

      // Coerce enums if present
      if (data.gender && !Object.values(Gender).includes(data.gender)) {
        return res.status(400).json({ error: 'Invalid gender' });
      }
      if (data.status && !Object.values(ApplicationStatus).includes(data.status)) {
        return res.status(400).json({ error: 'Invalid application status' });
      }

      const created = await prisma.application.create({ data });
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create application' });
    }
  }
);

// Documents API
app.get('/documents', async (req, res) => {
  try {
    const { applicationId } = req.query;
    if (!applicationId) return res.status(400).json({ error: 'applicationId is required' });
    const docs = await prisma.applicationDocument.findMany({
      where: { applicationId: String(applicationId) },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post(
  '/documents',
  [
    body('applicationId').custom((v, { req }) => !!(v || req.body.application_id)).withMessage('applicationId is required'),
    body('type').custom((v, { req }) => !!(v || req.body.document_type)).withMessage('type is required'),
    body('fileName').custom((v, { req }) => !!(v || req.body.document_name)).withMessage('fileName is required'),
    body('fileUrl').custom((v, { req }) => !!(v || req.body.document_url)).withMessage('fileUrl is required'),
    body('mimeType').optional().isString(),
    body('fileSize').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const b = req.body || {};
      const typeStr = (b.type ?? b.document_type);
      const allowed = ['birth_certificate','photo','previous_report','medical_record','other'];
      const typeVal = allowed.includes(String(typeStr)) ? String(typeStr) : 'other';

      const data = {
        applicationId: b.applicationId ?? b.application_id,
        type: typeVal,
        fileName: b.fileName ?? b.document_name,
        fileUrl: b.fileUrl ?? b.document_url,
        fileSize: typeof b.fileSize === 'number' ? b.fileSize : 0,
        mimeType: (b.mimeType ?? 'application/octet-stream'),
      };

      // Validate enum against Prisma if possible
      if (!Object.values(DocumentType).includes(data.type)) data.type = 'other';

      const created = await prisma.applicationDocument.create({ data });
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create document' });
    }
  }
);

/**
 * POST /applications/:id/approve - Approuve une demande d'inscription
 * 
 * Rôles autorisés: admin, direction
 * 
 * Processus complet:
 *   1. Vérifier que la demande existe et n'est pas déjà approuvée
 *   2. Calculer les frais de scolarité selon le programme
 *   3. Hacher les mots de passe par défaut (parent123, student123)
 *   4. Transaction atomique:
 *      - Créer le profil élève
 *      - Créer/MAJ le compte parent
 *      - Créer le compte élève
 *      - Marquer la demande comme approuvée
 *   5. Miroir du profil dans students-node (FastAPI)
 *   6. Envoyer notifications au parent et élève
 * 
 * Frais de scolarité:
 *   - Programme enrichi: 700$
 *   - Programme PEI: 800$
 *   - Sport/Arts: 750$
 *   - Autre: 500$
 */
app.post(
  '/applications/:id/approve',
  requireRole('admin', 'direction'),
  async (req, res) => {
  try {
    const id = req.params.id;
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Vérifier si déjà approuvée
    if (application.status === 'approved') {
      return res.status(400).json({ error: 'Application already approved' });
    }

    // Calcul automatique des frais selon le programme
    const program = application.program?.toLowerCase() || '';
    let tuitionAmount = 500;  // Par défaut
    if (program.includes('enrich')) tuitionAmount = 700;
    else if (program.includes('pei')) tuitionAmount = 800;
    else if (program.includes('sport') || program.includes('arts')) tuitionAmount = 750;

    // Hacher les mots de passe AVANT la transaction (opérations coûteuses)
    const parentPasswordHash = await bcrypt.hash('parent123', 10);
    const studentPasswordHash = await bcrypt.hash('student123', 10);
    
    // Générer l'email élève: prenom.nom@student.schoolreg.com
    // Nettoyer les noms (enlever espaces et caractères spéciaux)
    const cleanFirstName = application.firstName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const cleanLastName = application.lastName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const studentEmail = `${cleanFirstName}.${cleanLastName}@student.schoolreg.com`;

    // TRANSACTION ATOMIQUE - Tout réussit ou tout échoue
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le profil élève depuis la demande
      const student = await tx.student.create({
        data: {
          firstName: application.firstName,
          lastName: application.lastName,
          dateOfBirth: application.dateOfBirth,
          gender: application.gender,
          address: application.address,
          parentName: application.parentName,
          parentPhone: application.parentPhone,
          parentEmail: application.parentEmail,
          enrollmentDate: new Date(),
          status: 'active',
          program: application.program,
          session: application.session,
          secondaryLevel: application.secondaryLevel,
          tuitionAmount,
          applicationId: application.id,
        },
      });

      // 2. Créer ou mettre à jour le compte parent
      // upsert = update si existe, create sinon
      let parentUser = null;
      if (application.parentEmail) {
        parentUser = await tx.user.upsert({
          where: { email: application.parentEmail },
          update: {
            fullName: application.parentName,
          },
          create: {
            email: application.parentEmail,
            password: parentPasswordHash,
            fullName: application.parentName,
            role: 'parent',
          },
        });
      }

      // 3. Créer le compte élève
      const studentUser = await tx.user.upsert({
        where: { email: studentEmail },
        update: {
          fullName: `${application.firstName} ${application.lastName}`,
          studentId: student.id,
        },
        create: {
          email: studentEmail,
          password: studentPasswordHash,
          fullName: `${application.firstName} ${application.lastName}`,
          role: 'student',
          studentId: student.id,
        },
      });

      // 4. Marquer la demande comme approuvée et lier au profil élève
      const updatedApp = await tx.application.update({
        where: { id: application.id },
        data: { status: 'approved', reviewedAt: new Date(), studentId: student.id },
      });

      return { student, application: updatedApp, parentUser, studentUser };
    });

    // 5. Miroir du profil dans students-node (FastAPI)
    // Ce service gère les élèves, on crée donc un duplicata pour la cohérence
    try {
      const studentsServiceUrl = process.env.STUDENTS_SERVICE_URL || 'http://localhost:4003';
      // Mapper les champs requis par le service students-node
      const studentCreatePayload = {
        firstName: application.firstName,
        lastName: application.lastName,
        dateOfBirth: new Date(application.dateOfBirth).toISOString().split('T')[0],
        gender: application.gender,
        address: application.address,
        parentName: application.parentName,
        parentPhone: application.parentPhone,
        parentEmail: application.parentEmail,
        program: application.program,
        session: application.session,
        secondaryLevel: application.secondaryLevel,
        status: 'active',
        tuitionAmount: (typeof tuitionAmount === 'number' ? tuitionAmount : 0),
        applicationId: application.id,
        userId: result.studentUser.id,
      };

      // Créer l'élève dans students-node
      const headers = { 'Content-Type': 'application/json' };
      if (SERVICE_JWT) {
        headers['Authorization'] = `Bearer ${SERVICE_JWT}`;
      }
      const { data: studentsNodeStudent } = await axios.post(
        `${studentsServiceUrl}/students`,
        studentCreatePayload,
        { headers }
      );

      // Mettre à jour le user pour pointer vers l'ID du students-node (utilisé par le frontend)
      await prisma.user.update({
        where: { id: result.studentUser.id },
        data: { studentId: studentsNodeStudent.id },
      });

      // Remplacer dans l'objet de réponse pour cohérence front
      result.studentUser.studentId = studentsNodeStudent.id;
    } catch (linkErr) {
      console.error('Failed to mirror/link student to students-node:', linkErr?.message || linkErr);
      // Ne pas bloquer l'approbation; le parent/élève pourra utiliser l'interface de liaison manuelle si nécessaire
    }

    // Send notifications to parent and student
    if (result.parentUser) {
      await sendNotification({
        userId: result.parentUser.id,
        type: 'application_status',
        title: '🎉 Inscription approuvée',
        message: `L'inscription de ${application.firstName} ${application.lastName} a été approuvée! Frais de scolarité: ${tuitionAmount}$. Identifiants envoyés par email.`,
      });
    }

    if (result.studentUser) {
      await sendNotification({
        userId: result.studentUser.id,
        type: 'enrollment_update',
        title: '🎓 Bienvenue à SchoolReg!',
        message: `Votre inscription a été approuvée. Connectez-vous avec: ${studentEmail} / student123`,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve application' });
  }
  }
);

/**
 * POST /applications/:id/reject - Rejette une demande d'inscription
 * 
 * Rôles autorisés: admin, direction
 * 
 * Processus:
 *   1. Marquer la demande comme 'rejected'
 *   2. Enregistrer la raison du rejet
 *   3. Notifier le parent par email et notification
 * 
 * Body:
 *   - reason (optionnel): Raison du rejet
 */
app.post(
  '/applications/:id/reject',
  requireRole('admin', 'direction'),
  [body('reason').optional().isString().isLength({ min: 3 })],
  async (req, res) => {
  try {
    // Mettre à jour le statut de la demande
    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'rejected', reviewedAt: new Date(), notes: req.body.reason },
    });

    // Notifier le parent si l'email existe
    if (application.parentEmail) {
      const parentUser = await prisma.user.findUnique({ where: { email: application.parentEmail } });
      if (parentUser) {
        await sendNotification({
          userId: parentUser.id,
          type: 'application_status',
          title: '❌ Inscription refusée',
          message: `L'inscription de ${application.firstName} ${application.lastName} a été refusée. Raison: ${req.body.reason || 'Non spécifiée'}`,
        });
      }
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject application' });
  }
  }
);

/**
 * DELETE /applications/:id - Supprime une demande d'inscription
 * 
 * Rôles autorisés: admin, direction
 * 
 * Note: Les documents associés sont supprimés en cascade (config Prisma)
 */
app.delete(
  '/applications/:id',
  requireRole('admin', 'direction'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Supprimer la demande (cascade sur les documents)
      const application = await prisma.application.delete({
        where: { id }
      });

      res.json({ 
        success: true, 
        message: 'Application deleted successfully',
        id: application.id
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      
      // Erreur Prisma P2025 = enregistrement non trouvé
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      res.status(500).json({ 
        error: 'Failed to delete application',
        details: error.message 
      });
    }
  }
);

/**
 * POST /applications/access-by-code - Accès à une demande par code unique
 * 
 * Permet à un élève d'accéder à son profil avec les 8 premiers caractères
 * de l'ID de sa demande d'inscription (ex: #6485edfd)
 * 
 * Processus:
 *   1. Valider le format du code (8 caractères)
 *   2. Chercher les demandes commençant par ce code
 *   3. Vérifier que la demande est approuvée
 *   4. Générer un token JWT pour connexion automatique
 * 
 * Body:
 *   - code: 8 premiers caractères de l'ID de demande
 * 
 * Retourne:
 *   - Token JWT valide pour 24h
 *   - Informations du profil élève
 */
app.post('/applications/access-by-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Validation du format
    if (!code || typeof code !== 'string' || code.length !== 8) {
      return res.status(400).json({ error: 'Code invalide. Le code doit contenir 8 caractères.' });
    }

    // Chercher les demandes commençant par ce code
    const applications = await prisma.application.findMany({
      where: {
        id: {
          startsWith: code.toLowerCase()
        }
      },
      include: {
        student: true,
        documents: true
      }
    });

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Aucune demande trouvée avec ce code.' });
    }

    if (applications.length > 1) {
      return res.status(400).json({ error: 'Code ambigu. Veuillez contacter l\'administration.' });
    }

    const application = applications[0];

    // Check if application is approved
    if (application.status !== 'approved') {
      return res.status(403).json({ 
        error: 'Cette demande n\'a pas encore été approuvée.',
        status: application.status,
        submittedAt: application.submittedAt
      });
    }

    // Check if student exists
    if (!application.student) {
      return res.status(404).json({ error: 'Aucun profil élève associé à cette demande.' });
    }

    // Get student user account
    const studentUser = await prisma.user.findFirst({
      where: {
        studentId: application.student.id
      }
    });

    if (!studentUser) {
      return res.status(404).json({ error: 'Aucun compte utilisateur trouvé pour cet élève.' });
    }

    // Generate JWT token for the student
    const token = jwt.sign(
      {
        userId: studentUser.id,
        email: studentUser.email,
        role: studentUser.role,
        fullName: studentUser.fullName,
        studentId: application.student.id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Accès autorisé',
      application: {
        id: application.id,
        code: application.id.substring(0, 8),
        firstName: application.firstName,
        lastName: application.lastName,
        status: application.status,
        program: application.program,
        session: application.session
      },
      student: application.student,
      user: {
        id: studentUser.id,
        email: studentUser.email,
        role: studentUser.role,
        fullName: studentUser.fullName,
        studentId: application.student.id
      },
      token
    });
  } catch (error) {
    console.error('Error accessing application by code:', error);
    res.status(500).json({ error: 'Erreur lors de l\'accès au profil.' });
  }
});

app.listen(PORT, () => {
  console.log(`applications-node listening on http://localhost:${PORT}`);
});
