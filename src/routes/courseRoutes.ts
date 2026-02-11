import { Router, Request, Response } from 'express';
import { CourseRepository } from '../repositories/courseRepository';
import { CourseResponse, Course } from '../types/course';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * GET /api/courses - Get all courses with pagination
 * Query params: page (default: 1), limit (default: 10), category_id, status, level
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
      status: req.query.status as string | undefined,
      level: req.query.level as string | undefined,
    };

    const { courses, total } = await CourseRepository.getAllCourses(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
    });
  }
});

/**
 * GET /api/courses/:id - Get course by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const course = await CourseRepository.getCourseById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const response: CourseResponse = {
      success: true,
      data: course,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
    });
  }
});

/**
 * GET /api/courses/category/:categoryId - Get courses by category
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
      });
    }

    const { courses, total } = await CourseRepository.getCoursesByCategory(categoryId, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch courses by category',
    });
  }
});

/**
 * GET /api/courses/creator/:creatorId - Get courses by creator
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/creator/:creatorId', async (req: Request, res: Response) => {
  try {
    const creatorId = parseInt(req.params.creatorId as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (isNaN(creatorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid creator ID',
      });
    }

    const { courses, total } = await CourseRepository.getCoursesByCreator(creatorId, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching courses by creator:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch courses by creator',
    });
  }
});

/**
 * GET /api/courses/top - Get top/featured courses
 * Query params: limit (default: 10)
 */
router.get('/top/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const courses = await CourseRepository.getTopCourses(limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching top courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top courses',
    });
  }
});

/**
 * GET /api/courses/free - Get free courses
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/free/list', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { courses, total } = await CourseRepository.getFreeCourses(limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching free courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch free courses',
    });
  }
});

/**
 * GET /api/courses/search/query - Search courses
 * Query params: q (search query), page (default: 1), limit (default: 10)
 */
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const { courses, total } = await CourseRepository.searchCourses(searchTerm, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error searching courses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search courses',
    });
  }
});

/**
 * GET /api/courses/search/fuzzy - Fuzzy search courses by keywords
 * Searches across: title, short_description, description, outcomes, section, course_type
 * Query params: q (keywords), page (default: 1), limit (default: 10)
 */
router.get('/search/fuzzy', async (req: Request, res: Response) => {
  try {
    const keywords = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!keywords || keywords.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords are required for fuzzy search',
      });
    }

    const { courses, total } = await CourseRepository.fuzzySearchCourses(keywords, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in fuzzy search:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform fuzzy search',
    });
  }
});

/**
 * GET /api/courses/level/:level - Get courses by level
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/level/:level', async (req: Request, res: Response) => {
  try {
    const level = req.params.level as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { courses, total } = await CourseRepository.getCoursesByLevel(level, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching courses by level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses by level',
    });
  }
});

/**
 * GET /api/courses/published - Get published courses
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/published/list', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { courses, total } = await CourseRepository.getPublishedCourses(limit, offset);
    const pages = Math.ceil(total / limit);

    const response: CourseResponse = {
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching published courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch published courses',
    });
  }
});

/**
 * POST /api/courses/add/admin - Create a new course (Admin only)
 * Body: Course data (title, description, price, etc.)
 */
router.post('/add/admin', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const courseData = req.body as Partial<Course>;

    // Validate required fields
    if (!courseData.title || !courseData.faqs) {
      return res.status(400).json({
        success: false,
        error: 'Title and FAQs are required',
      });
    }

    const newCourse = await CourseRepository.createCourse(courseData);

    const response: CourseResponse = {
      success: true,
      message: 'Course created successfully',
      data: newCourse,
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create course',
    });
  }
});

/**
 * PUT /api/courses/update/admin/:id - Update a course (Admin only)
 * Body: Partial course data to update
 */
router.put('/update/admin/:id', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const courseData = req.body as Partial<Course>;

    const updatedCourse = await CourseRepository.updateCourse(id, courseData);

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const response: CourseResponse = {
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error updating course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update course',
    });
  }
});

/**
 * DELETE /api/courses/delete/admin/:id - Delete a course (Admin only)
 */
router.delete('/delete/admin/:id', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID',
      });
    }

    const deleted = await CourseRepository.deleteCourse(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const response: CourseResponse = {
      success: true,
      message: 'Course deleted successfully',
    };

    return res.json(response);
  } catch (error) {
    console.error('Error deleting course:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete course',
    });
  }
});

export default router;
