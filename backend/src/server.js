const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const researcherRoutes = require('./routes/researchers');
const trialsRoutes = require('./routes/trials');
const publicationsRoutes = require('./routes/publications');
const expertsRoutes = require('./routes/experts');
const forumsRoutes = require('./routes/forums');
const favoritesRoutes = require('./routes/favorites');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration - allow all origins for now (can be restricted later)
app.use(cors({
  origin: true, // Allow all origins (for production with multiple frontends)
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));
// Ensure preflight requests succeed universally
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/researchers', researcherRoutes);
app.use('/api/trials', trialsRoutes);
app.use('/api/publications', publicationsRoutes);
app.use('/api/experts', expertsRoutes);
app.use('/api/forums', forumsRoutes);
app.use('/api/favorites', favoritesRoutes);

// Root route - API information
app.get('/', (req, res) => {
  res.json({ 
    message: 'CuraLink API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      docs: 'See README for full API documentation'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CuraLink API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error('\n🔍 Options to fix:');
    console.error(`1. Kill the process using port ${PORT}:`);
    console.error(`   lsof -ti:${PORT} | xargs kill -9`);
    console.error(`2. Or change PORT in .env file to a different port (e.g., 5001)`);
    console.error(`3. Or find what's using it: lsof -i:${PORT}`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

