require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const qcmRoutes = require('./routes/qcm');
const paymentRoutes = require('./routes/payment');
const quizRoutes = require('./routes/quiz');
const otpRoutes = require('./routes/otp');

const app = express();

// CORS : uniquement le front-end autorisé
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
  })
);

// IMPORTANT : la route webhook a besoin du corps BRUT (Buffer) pour vérifier
// la signature FedaPay — express.json() la parserait et casserait la
// vérification de signature. On exclut donc ce chemin du parsing JSON
// global ; le parsing raw() propre au webhook est défini dans payment.js.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') return next();
  express.json()(req, res, next);
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/qcm', qcmRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/otp', otpRoutes);

// Gestion d'erreur générique (filet de sécurité)
app.use((err, _req, res, _next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur serveur inattendue.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serveur SMC la Réussite démarré sur le port ${PORT}`);
});
