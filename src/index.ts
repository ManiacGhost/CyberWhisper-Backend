import dotenv from 'dotenv';

// Load environment variables FIRST before importing anything else
dotenv.config();

import express, { Express, Request, Response } from 'express';
import courseRoutes from './routes/courseRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
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
      health: '/',
    },
  });
});

// API Routes
app.use('/api/courses', courseRoutes);

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
