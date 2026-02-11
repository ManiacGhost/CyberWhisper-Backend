import { Router, Request, Response } from 'express';
import { CourseEnrollmentRepository } from '../repositories/courseEnrollmentRepository';
import { CourseEnrollmentResponse, CourseEnrollment } from '../types/courseEnrollment';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * POST /api/course-enrollments/add - Create a new course enrollment
 * Body: Enrollment data (course_name, name, email, phone_number)
 */
router.post('/add', async (req: Request, res: Response) => {
  try {
    const enrollmentData = req.body as Omit<CourseEnrollment, 'id' | 'enrolled_at'>;

    // Validate required fields
    const requiredFields = ['course_name', 'name', 'email', 'phone_number'];
    const missingFields = requiredFields.filter((field) => !enrollmentData[field as keyof typeof enrollmentData]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(enrollmentData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const newEnrollment = await CourseEnrollmentRepository.createEnrollment(enrollmentData);

    const response: CourseEnrollmentResponse = {
      success: true,
      message: 'Course enrollment created successfully',
      data: newEnrollment,
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating course enrollment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create course enrollment',
    });
  }
});

/**
 * GET /api/course-enrollments - Get all course enrollments with pagination
 * Query params: page (default: 1), limit (default: 10), course_name, email
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      course_name: req.query.course_name as string | undefined,
      email: req.query.email as string | undefined,
    };

    const { enrollments, total } = await CourseEnrollmentRepository.getAllEnrollments(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    const response: CourseEnrollmentResponse = {
      success: true,
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course enrollments',
    });
  }
});

/**
 * GET /api/course-enrollments/:id - Get single course enrollment
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid enrollment ID',
      });
    }

    const enrollment = await CourseEnrollmentRepository.getEnrollmentById(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Course enrollment not found',
      });
    }

    const response: CourseEnrollmentResponse = {
      success: true,
      data: enrollment,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching course enrollment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course enrollment',
    });
  }
});

/**
 * GET /api/course-enrollments/course/:courseName - Get enrollments by course name
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/course/:courseName', async (req: Request, res: Response) => {
  try {
    const courseName = req.params.courseName as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { enrollments, total } = await CourseEnrollmentRepository.getEnrollmentsByCourseName(
      courseName,
      limit,
      offset
    );
    const pages = Math.ceil(total / limit);

    const response: CourseEnrollmentResponse = {
      success: true,
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching enrollments by course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch enrollments by course',
    });
  }
});

/**
 * GET /api/course-enrollments/email/:email - Get enrollments by email
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { enrollments, total } = await CourseEnrollmentRepository.getEnrollmentsByEmail(email, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseEnrollmentResponse = {
      success: true,
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching enrollments by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch enrollments by email',
    });
  }
});

/**
 * PUT /api/course-enrollments/update/:id - Update course enrollment (Admin only)
 * Body: Partial enrollment data to update
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
          error: 'Invalid enrollment ID',
        });
      }

      const enrollmentData = req.body as Partial<Omit<CourseEnrollment, 'id' | 'enrolled_at'>>;

      // Validate email if provided
      if (enrollmentData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(enrollmentData.email)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email format',
          });
        }
      }

      const updatedEnrollment = await CourseEnrollmentRepository.updateEnrollment(id, enrollmentData);

      if (!updatedEnrollment) {
        return res.status(404).json({
          success: false,
          error: 'Course enrollment not found',
        });
      }

      const response: CourseEnrollmentResponse = {
        success: true,
        message: 'Course enrollment updated successfully',
        data: updatedEnrollment,
      };

      return res.json(response);
    } catch (error) {
      console.error('Error updating course enrollment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update course enrollment',
      });
    }
  }
);

/**
 * DELETE /api/course-enrollments/delete/:id - Delete course enrollment (Admin only)
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
          error: 'Invalid enrollment ID',
        });
      }

      const deleted = await CourseEnrollmentRepository.deleteEnrollment(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Course enrollment not found',
        });
      }

      const response: CourseEnrollmentResponse = {
        success: true,
        message: 'Course enrollment deleted successfully',
      };

      return res.json(response);
    } catch (error) {
      console.error('Error deleting course enrollment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete course enrollment',
      });
    }
  }
);

export default router;
