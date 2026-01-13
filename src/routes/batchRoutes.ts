import { Router, Request, Response } from 'express';
import { BatchRepository } from '../repositories/batchRepository';
import { CreateBatchRequest, UpdateBatchRequest } from '../types/batch';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/batches
 * Create a new batch
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      course_id,
      program_name,
      program_type,
      start_date,
      end_date,
      start_time,
      end_time,
      schedule_type,
      max_students,
      duration_weeks,
      instructor_id,
      price,
      discount_price,
      description,
      status,
    } = req.body;

    // Validate required fields
    if (!course_id || !program_name || !program_type || !start_date || !end_date || !start_time || !end_time || !schedule_type || max_students === undefined || duration_weeks === undefined || !instructor_id || price === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: course_id, program_name, program_type, start_date, end_date, start_time, end_time, schedule_type, max_students, duration_weeks, instructor_id, price',
      });
      return;
    }

    // Validate status enum
    const validStatuses = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const batchData: CreateBatchRequest = {
      course_id,
      program_name,
      program_type,
      start_date,
      end_date,
      start_time,
      end_time,
      schedule_type,
      max_students,
      duration_weeks,
      instructor_id,
      price,
      discount_price,
      description,
      status: status || 'ACTIVE',
    };

    const batch = await BatchRepository.createBatch(batchData);

    res.status(201).json({
      success: true,
      data: batch,
    });
  })
);

/**
 * GET /api/batches
 * Get all batches with pagination
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      course_id: req.query.course_id ? parseInt(req.query.course_id as string) : undefined,
      status: req.query.status as string | undefined,
      instructor_id: req.query.instructor_id ? parseInt(req.query.instructor_id as string) : undefined,
    };

    const { batches, total } = await BatchRepository.getAllBatches(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: batches,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  })
);

/**
 * GET /api/batches/active
 * Get active batches
 */
router.get(
  '/active',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 10;
    const batches = await BatchRepository.getActiveBatches(limit);

    res.json({
      success: true,
      data: batches,
    });
  })
);

/**
 * GET /api/batches/course/:courseId
 * Get batches by course ID
 */
router.get(
  '/course/:courseId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { batches, total } = await BatchRepository.getBatchesByCourse(courseId, limit, offset);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: batches,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  })
);

/**
 * GET /api/batches/instructor/:instructorId
 * Get batches by instructor ID
 */
router.get(
  '/instructor/:instructorId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const instructorId = parseInt(req.params.instructorId);
    if (isNaN(instructorId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid instructor ID',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { batches, total } = await BatchRepository.getBatchesByInstructor(instructorId, limit, offset);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: batches,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  })
);

/**
 * GET /api/batches/search
 * Search batches by program name
 */
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const searchTerm = req.query.q as string;

    if (!searchTerm || searchTerm.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { batches, total } = await BatchRepository.searchBatches(searchTerm, limit, offset);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: batches,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    });
  })
);

/**
 * GET /api/batches/:id
 * Get batch by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid batch ID',
      });
      return;
    }

    const batch = await BatchRepository.getBatchById(id);

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    res.json({
      success: true,
      data: batch,
    });
  })
);

/**
 * POST /api/batches/:id
 * Update batch
 */
router.post(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid batch ID',
      });
      return;
    }

    const batch = await BatchRepository.getBatchById(id);

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    // Validate status enum if provided
    if (req.body.status && !['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING'].includes(req.body.status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ACTIVE, INACTIVE, COMPLETED, UPCOMING',
      });
      return;
    }

    const updateData: UpdateBatchRequest = req.body;
    const updatedBatch = await BatchRepository.updateBatch(id, updateData);

    if (!updatedBatch) {
      res.status(500).json({
        success: false,
        error: 'Failed to update batch',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedBatch,
    });
  })
);

/**
 * DELETE /api/batches/:id
 * Delete batch
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid batch ID',
      });
      return;
    }

    const batch = await BatchRepository.getBatchById(id);

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    const deleted = await BatchRepository.deleteBatch(id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete batch',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Batch deleted successfully',
    });
  })
);

export default router;
