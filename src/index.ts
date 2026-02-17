import dotenv from 'dotenv';

// Load environment variables FIRST before importing anything else
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import courseRoutes from './routes/courseRoutes';
import blogRoutes from './routes/blogRoutes';
import batchRoutes from './routes/batchRoutes';
import userRoutes from './routes/userRoutes';
import skillRoutes from './routes/skillRoutes';
import quoteRoutes from './routes/quoteRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import galleryRoutes from './routes/galleryRoutes';
import authRoutes from './routes/authRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import deployTeamTrainingRoutes from './routes/deployTeamTrainingRoutes';
import brochureDownloadRoutes from './routes/brochureDownloadRoutes';
import courseEnrollmentRoutes from './routes/courseEnrollmentRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const port = process.env.PORT || 3000;

const VERCEL_FRONTEND_DOMAIN_PATTERN =
  /^https:\/\/cyberwhisperupdatedfrontend(?:-[a-z0-9-]+)?\.vercel\.app$/i;

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return VERCEL_FRONTEND_DOMAIN_PATTERN.test(origin);
}

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3031',
      'https://cyberwhisperupdatedfrontend.vercel.app',
      'https://cyberwhisperupdatedfrontend-e4z7trsyr-tanuj-s-projects.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean);

    // For development, allow requests with no origin (like mobile apps or curl requests)
    if (isAllowedOrigin(origin, allowedOrigins as string[])) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow all origins
      callback(null, true);
    } else {
      const corsError = new Error('Not allowed by CORS') as Error & { status?: number };
      corsError.status = 403;
      callback(corsError);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'CyberWhisper Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      adminAuth: '/api/admin',
      courses: '/api/courses',
      blogs: '/api/blogs',
      batches: '/api/batches',
      users: '/api/users',
      skills: '/api/skills',
      quotes: '/api/quotes',
      newsletter: '/api/newsletter',
      brochureDownloads: '/api/brochure-downloads',
      courseEnrollments: '/api/course-enrollments',
      gallery: '/api/gallery',
      deployTeamTraining: '/api/deploy-team-training',
      health: '/',
    },
  });
});

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/deploy-team-training', deployTeamTrainingRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/brochure-downloads', brochureDownloadRoutes);
app.use('/api/course-enrollments', courseEnrollmentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`✓ Server running on http://localhost:${port}`);
  console.log(`✓ Database: ${process.env.DB_NAME || 'cyberwhisper'}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

