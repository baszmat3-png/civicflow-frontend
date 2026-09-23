import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware.js';
import { sendSuccess } from './utils/apiResponse.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Trust proxy for Render / Cloudflare reverse proxies so rate limiter gets real client IP
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration for Frontend
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:3000'
      ];
      if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request parsers (Support large file payloads up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Static uploads serving is restricted to non-production environments
// In production, all document downloads must go through authenticated/authorized API endpoints
if (env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));
}

// Health check & Infrastructure monitoring endpoint (Always accessible for Render / Ping)
app.get(['/api/health', '/health'], (req, res) => {
  return res.json({
    success: true,
    status: 'ok',
    maintenance: Boolean(env.MAINTENANCE_MODE),
    timestamp: new Date().toISOString()
  });
});

// Dedicated Maintenance Status check endpoint (Always accessible)
app.get(['/api/maintenance/status', '/api/system/status'], (req, res) => {
  return res.json({
    success: true,
    maintenance: Boolean(env.MAINTENANCE_MODE),
    message: env.MAINTENANCE_MODE
      ? 'الخدمة متوقفة مؤقتًا للصيانة'
      : 'الخدمة تعمل بشكل طبيعي'
  });
});

// Production Maintenance Mode Guard
app.use(maintenanceMiddleware);

// Mount API Router
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);