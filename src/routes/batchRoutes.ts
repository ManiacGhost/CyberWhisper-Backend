import { Router, Request, Response } from 'express';
import { BatchRepository } from '../repositories/batchRepository';
import { BatchEnrollmentRepository } from '../repositories/batchEnrollmentRepository';
import { CreateBatchRequest, UpdateBatchRequest } from '../types/batch';
import { asyncHandler } from '../middleware/errorHandler';
import { logAudit, getChangedFields } from '../utils/auditLogger';
import { authMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * POST /api/batches
 * Create a new batch
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Log the creation
    const authReq = req as AuthRequest;
    await logAudit({
      userId: authReq.user?.userId,
      action: 'CREATE',
      entityType: 'BATCH',
      entityId: batch.id,
      entityName: batch.program_name,
      newValues: batch,
      req,
    });

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
    const courseId = parseInt(req.params.courseId as string);
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
    const instructorId = parseInt(req.params.instructorId as string);
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
 * POST /api/batches/enroll
 * Public batch enroll form endpoint
 * Body: batch_id, name, email, phone_number
 */
router.post(
  '/enroll',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { batch_id, name, email, phone_number } = req.body as {
      batch_id?: number | string;
      name?: string;
      email?: string;
      phone_number?: string;
    };

    // Validate required fields
    if (!batch_id || !name || !email || !phone_number) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: batch_id, name, email, phone_number',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Parse and validate batch_id
    const parsedBatchId = parseInt(String(batch_id), 10);
    if (isNaN(parsedBatchId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid batch_id',
      });
      return;
    }

    // Check if batch exists
    const batch = await BatchRepository.getBatchById(parsedBatchId);
    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    // Create enrollment record
    const enrollment = await BatchEnrollmentRepository.createEnrollment({
      batch_id: parsedBatchId,
      name: name.trim(),
      email: email.trim(),
      phone_number: phone_number.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Batch enrollment submitted successfully',
      data: enrollment,
    });
  })
);

/**
 * GET /api/batches/enrollment/:enrollmentId
 * Get single batch enrollment by ID
 */
router.get(
  '/enrollment/:enrollmentId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const enrollmentId = parseInt(req.params.enrollmentId as string);

    if (isNaN(enrollmentId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await BatchEnrollmentRepository.getEnrollmentById(enrollmentId);

    if (!enrollment) {
      res.status(404).json({
        success: false,
        error: 'Batch enrollment not found',
      });
      return;
    }

    res.json({
      success: true,
      data: enrollment,
    });
  })
);

/**
 * GET /api/batches/enrollments
 * Get all batch enrollments with pagination
 */
router.get(
  '/enrollments',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      batch_id: req.query.batch_id ? parseInt(req.query.batch_id as string) : undefined,
      email: req.query.email as string | undefined,
    };

    const { enrollments, total } = await BatchEnrollmentRepository.getAllEnrollments(
      limit,
      offset,
      filters
    );
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: enrollments,
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
 * GET /api/batches/:id/enrollments
 * Get enrollments for a specific batch
 */
router.get(
  '/:id/enrollments',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const batchId = parseInt(req.params.id as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (isNaN(batchId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid batch ID',
      });
      return;
    }

    const batch = await BatchRepository.getBatchById(batchId);
    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    const { enrollments, total } = await BatchEnrollmentRepository.getEnrollmentsByBatchId(
      batchId,
      limit,
      offset
    );
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: enrollments,
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
    const id = parseInt(req.params.id as string);

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
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string);

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

    // Log the update with before/after values
    const authReq = req as AuthRequest;
    const { oldValues, newValues } = getChangedFields(batch, updatedBatch);

    await logAudit({
      userId: authReq.user?.userId,
      action: 'UPDATE',
      entityType: 'BATCH',
      entityId: id,
      entityName: updatedBatch.program_name,
      oldValues,
      newValues,
      req,
    });

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
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string);

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

    // Log the deletion
    const authReq = req as AuthRequest;
    await logAudit({
      userId: authReq.user?.userId,
      action: 'DELETE',
      entityType: 'BATCH',
      entityId: id,
      entityName: batch.program_name,
      oldValues: batch,
      req,
    });

    res.json({
      success: true,
      message: 'Batch deleted successfully',
    });
  })
);

export default router;
