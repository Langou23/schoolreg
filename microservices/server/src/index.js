import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Charge .env à la racine
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = Number(process.env.GATEWAY_PORT || 3001);

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);
  return cb(null, false);
}, credentials: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.url}`);
  next();
});

// Static uploads (dossier partagé dans microservices)
const microservicesRoot = path.resolve(__dirname, '../../');
app.use('/uploads', express.static(path.join(microservicesRoot, 'uploads')));

// Cibles des services - Architecture 100% Microservices Distribuée
const TARGETS = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  STUDENTS: process.env.STUDENTS_SERVICE_URL || 'http://localhost:4002',
  APPLICATIONS: process.env.APPLICATIONS_SERVICE_URL || 'http://localhost:4003',
  PAYMENTS: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:4004',
  CLASSES: process.env.CLASSES_SERVICE_URL || 'http://localhost:4005',
  NOTIFICATIONS: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4006',
  RESOURCES: process.env.RESOURCES_SERVICE_URL || 'http://localhost:5001',
};

const commonProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  ws: true,
  preserveHeaderKeyCase: true,
  xfwd: true,
  pathRewrite: { '^/api': '' },
  timeout: 120000, // 2 minutes timeout
  proxyTimeout: 120000,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${target}${req.url.replace('/api', '')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Gateway proxy error', message: err.message });
  },
});

// Plus besoin de monolith proxy - tout est en microservices!

// Mapping des routes -> microservices (plus de fallback monolithe)

// Resources & Modules (FastAPI)
app.use('/api/resources', commonProxy(TARGETS.RESOURCES));
app.use('/api/modules', commonProxy(TARGETS.RESOURCES));

// Applications, Documents, Upload (Node + Prisma)
app.use('/api/upload', commonProxy(TARGETS.APPLICATIONS));
app.use('/api/applications', commonProxy(TARGETS.APPLICATIONS));
app.use('/api/documents', commonProxy(TARGETS.APPLICATIONS));

// Students, Enrollments, Dashboard (FastAPI + SQLAlchemy)
app.use('/api/students', commonProxy(TARGETS.STUDENTS));
app.use('/api/enrollments', commonProxy(TARGETS.STUDENTS));
app.use('/api/dashboard', commonProxy(TARGETS.STUDENTS));

// Payments (FastAPI + Stripe)
// Routes /api/stripe/* et /api/payments/* vers le service de paiement
// Le service attend les routes sans préfixe (ex: /checkout-session, /payments, etc.)
app.use('/api/stripe', createProxyMiddleware({
  target: TARGETS.PAYMENTS,
  changeOrigin: true,
  pathRewrite: { '^/api/stripe': '' },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[STRIPE PROXY] ${req.method} ${req.url} -> ${TARGETS.PAYMENTS}${req.url.replace('/api/stripe', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[STRIPE PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Payment service error', message: err.message });
  },
}));
app.use('/api/payments', createProxyMiddleware({
  target: TARGETS.PAYMENTS,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // /api/payments -> /payments
    // /api/payments/payment-intent -> /payment-intent
    const newPath = path.replace('/api/payments', '/payments').replace('/payments/payment-intent', '/payment-intent');
    console.log(`[PAYMENTS PROXY] ${req.method} ${path} -> ${newPath}`);
    return newPath;
  },
  onError: (err, req, res) => {
    console.error(`[PAYMENTS PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Payment service error', message: err.message });
  },
}));

// Auth, Classes, Notifications (Microservices Dédiés - Architecture Distribuée)
// Auth needs special pathRewrite to remove /api/auth completely
app.use('/api/auth', createProxyMiddleware({
  target: TARGETS.AUTH,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/auth': '' }, // /api/auth/signin -> /signin
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[AUTH PROXY] ${req.method} ${req.url} -> ${TARGETS.AUTH}${req.url.replace('/api/auth', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[AUTH PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Auth service error', message: err.message });
  },
}));

// Classes and Notifications also need specific pathRewrite
app.use('/api/classes', createProxyMiddleware({
  target: TARGETS.CLASSES,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/classes': '' }, // /api/classes -> /
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[CLASSES PROXY] ${req.method} ${req.url} -> ${TARGETS.CLASSES}${req.url.replace('/api/classes', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[CLASSES PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Classes service error', message: err.message });
  },
}));

app.use('/api/notifications', createProxyMiddleware({
  target: TARGETS.NOTIFICATIONS,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/notifications': '' }, // /api/notifications -> /
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[NOTIFICATIONS PROXY] ${req.method} ${req.url} -> ${TARGETS.NOTIFICATIONS}${req.url.replace('/api/notifications', '')}`);
  },
  onError: (err, req, res) => {
    console.error(`[NOTIFICATIONS PROXY ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(502).json({ error: 'Notifications service error', message: err.message });
  },
}));

// 404 for unknown routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', gateway: true, port: PORT }));
app.get('/', (_req, res) => res.type('text').send('SchoolReg API Gateway'));

app.listen(PORT, () => {
  console.log(`Gateway listening on http://localhost:${PORT}`);
});
