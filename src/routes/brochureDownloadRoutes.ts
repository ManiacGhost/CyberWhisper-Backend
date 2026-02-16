import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BrochureDownloadRepository } from '../repositories/brochureDownloadRepository';
import { BrochureDownloadResponse, BrochureDownload } from '../types/brochureDownload';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';
import { uploadToS3 } from '../utils/s3Upload';

// Extend Express Request to include file property from multer
interface MulterRequest extends Request {
  file?: any;
}

const router = Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for brochures
  fileFilter: (_req: Request, file: any, cb: any) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, and TXT are allowed.'));
    }
  },
});

/**
 * POST /api/brochure-downloads/upload
 * Upload a brochure file to S3
 */
router.post(
  '/upload',
  authMiddleware,
  adminOnlyMiddleware,
  upload.single('file'),
  async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
        });
        return;
      }

      // Optional: Get custom expiration time from request body (in seconds)
      // Default is 24 hours (86400 seconds)
      const expirationSeconds = req.body.expiresIn ? parseInt(req.body.expiresIn) : 86400;

      const result = await uploadToS3(req.file.buffer, req.file.originalname, 'brochures', expirationSeconds);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to upload brochure',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Brochure uploaded successfully',
        data: {
          presignedUrl: result.presignedUrl,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          key: result.key,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error: any) {
      console.error('Error uploading brochure:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload brochure',
      });
    }
  }
);

/**
 * POST /api/brochure-downloads/add - Record a brochure download
 * Body: Download data (name, email, mobile_number)
 */
router.post('/add', async (req: Request, res: Response) => {
  try {
    const downloadData = req.body as Omit<BrochureDownload, 'id' | 'downloaded_at'>;

    // Validate required fields
    const requiredFields = ['name', 'email', 'mobile_number'];
    const missingFields = requiredFields.filter((field) => !downloadData[field as keyof typeof downloadData]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(downloadData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const newDownload = await BrochureDownloadRepository.createDownload(downloadData);

    const response: BrochureDownloadResponse = {
      success: true,
      message: 'Brochure download recorded successfully',
      data: newDownload,
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error recording brochure download:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record brochure download',
    });
  }
});

/**
 * GET /api/brochure-downloads - Get all brochure downloads with pagination
 * Query params: page (default: 1), limit (default: 10), email, name
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      email: req.query.email as string | undefined,
      name: req.query.name as string | undefined,
    };

    const { downloads, total } = await BrochureDownloadRepository.getAllDownloads(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    const response: BrochureDownloadResponse = {
      success: true,
      data: downloads,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching brochure downloads:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch brochure downloads',
    });
  }
});

/**
 * GET /api/brochure-downloads/:id - Get single brochure download
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid download ID',
      });
    }

    const download = await BrochureDownloadRepository.getDownloadById(id);

    if (!download) {
      return res.status(404).json({
        success: false,
        error: 'Brochure download not found',
      });
    }

    const response: BrochureDownloadResponse = {
      success: true,
      data: download,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching brochure download:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch brochure download',
    });
  }
});

/**
 * GET /api/brochure-downloads/email/:email - Get downloads by email
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { downloads, total } = await BrochureDownloadRepository.getDownloadsByEmail(email, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: BrochureDownloadResponse = {
      success: true,
      data: downloads,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching downloads by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch downloads by email',
    });
  }
});

/**
 * GET /api/brochure-downloads/name/:name - Get downloads by name
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/name/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { downloads, total } = await BrochureDownloadRepository.getDownloadsByName(name, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: BrochureDownloadResponse = {
      success: true,
      data: downloads,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching downloads by name:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch downloads by name',
    });
  }
});

/**
 * PUT /api/brochure-downloads/update/:id - Update brochure download (Admin only)
 * Body: Partial download data to update
 */
router.put(
  '/update/:id',
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid download ID',
        });
      }

      const downloadData = req.body as Partial<Omit<BrochureDownload, 'id' | 'downloaded_at'>>;

      // Validate email if provided
      if (downloadData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(downloadData.email)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email format',
          });
        }
      }

      const updatedDownload = await BrochureDownloadRepository.updateDownload(id, downloadData);

      if (!updatedDownload) {
        return res.status(404).json({
          success: false,
          error: 'Brochure download not found',
        });
      }

      const response: BrochureDownloadResponse = {
        success: true,
        message: 'Brochure download updated successfully',
        data: updatedDownload,
      };

      return res.json(response);
    } catch (error) {
      console.error('Error updating brochure download:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update brochure download',
      });
    }
  }
);

/**
 * DELETE /api/brochure-downloads/delete/:id - Delete brochure download (Admin only)
 */
router.delete(
  '/delete/:id',
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid download ID',
        });
      }

      const deleted = await BrochureDownloadRepository.deleteDownload(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Brochure download not found',
        });
      }

      const response: BrochureDownloadResponse = {
        success: true,
        message: 'Brochure download deleted successfully',
      };

      return res.json(response);
    } catch (error) {
      console.error('Error deleting brochure download:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete brochure download',
      });
    }
  }
);

export default router;
