import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeUploadDirectories } from './config/upload';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import eventRoutes from './routes/events';
import expenseRoutes from './routes/expenses';
import settingsRoutes from './routes/settings';
import devDashboardRoutes from './routes/devDashboard';
import quickActionsRoutes from './routes/quickActions';
import syncRoutes from './routes/sync';
import ocrV2Routes from './routes/ocrV2';
import ocrTrainingRoutes from './routes/ocrTraining';
import learningAnalyticsRoutes from './routes/learningAnalytics';
import modelRetrainingRoutes from './routes/modelRetraining';
import trainingSyncRoutes from './routes/trainingSync';
import checklistRoutes from './routes/checklist';
import { requestLogger, errorLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { sessionTracker } from './middleware/sessionTracker';
import { apiRequestLogger } from './middleware/apiRequestLogger';

dotenv.config();

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
// Parse CORS_ORIGIN - support comma-separated origins or single origin
const corsOrigin = process.env.CORS_ORIGIN 
  ? (process.env.CORS_ORIGIN.includes(',') 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : process.env.CORS_ORIGIN.trim())
  : '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);
app.use(apiRequestLogger); // Log all API requests for analytics

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));
app.use('/api/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

// Routes - Auth routes FIRST (no authentication required)
app.use('/api/auth', authRoutes);

// Authenticated routes with session tracking
// Session tracking updates last_activity on every API request for real-time monitoring
app.use('/api/users', authenticateToken, sessionTracker, userRoutes);
app.use('/api/roles', authenticateToken, sessionTracker, roleRoutes);
app.use('/api/events', authenticateToken, sessionTracker, eventRoutes);
app.use('/api/expenses', authenticateToken, sessionTracker, expenseRoutes);
app.use('/api/settings', authenticateToken, sessionTracker, settingsRoutes);
app.use('/api/dev-dashboard', authenticateToken, sessionTracker, devDashboardRoutes);
app.use('/api/quick-actions', authenticateToken, sessionTracker, quickActionsRoutes);
app.use('/api/sync', authenticateToken, sessionTracker, syncRoutes);
app.use('/api/ocr/v2', authenticateToken, sessionTracker, ocrV2Routes);
app.use('/api/training', authenticateToken, sessionTracker, ocrTrainingRoutes);
app.use('/api/learning', authenticateToken, sessionTracker, learningAnalyticsRoutes);
app.use('/api/retraining', authenticateToken, sessionTracker, modelRetrainingRoutes);
app.use('/api/training/sync', authenticateToken, sessionTracker, trainingSyncRoutes);
app.use('/api/checklist', authenticateToken, sessionTracker, checklistRoutes);

// Health check (with database connectivity test)
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Dynamic import to avoid circular dependency
    const { query } = await import('./config/database');
    await query('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      database: 'connected',
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error: any) {
    console.error('[Health] Health check failed:', error);
    
    res.status(503).json({
      status: 'error',
      version: VERSION,
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed',
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Error handling (must be after routes)
app.use(errorLogger);
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize upload directories on startup
initializeUploadDirectories();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Version: ${VERSION}`);
  console.log(`Listening on 0.0.0.0:${PORT}`);
});
