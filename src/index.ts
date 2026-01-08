import dotenv from 'dotenv';

// Load environment variables FIRST before importing anything else
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import courseRoutes from './routes/courseRoutes';
import blogRoutes from './routes/blogRoutes';
import userRoutes from './routes/userRoutes';
import skillRoutes from './routes/skillRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
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
      courses: '/api/courses',
      blogs: '/api/blogs',
      users: '/api/users',
      skills: '/api/skills',
      health: '/',
    },
  });
});

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);

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

