import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import eventRoutes from './routes/events';
import expenseRoutes from './routes/expenses';
import settingsRoutes from './routes/settings';
import devDashboardRoutes from './routes/devDashboard';
import quickActionsRoutes from './routes/quickActions';
import syncRoutes from './routes/sync';
import { requestLogger, errorLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));
app.use('/api/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dev-dashboard', devDashboardRoutes);
app.use('/api/quick-actions', quickActionsRoutes);
app.use('/api/sync', syncRoutes);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Version: ${VERSION}`);
  console.log(`Listening on 0.0.0.0:${PORT}`);
});
