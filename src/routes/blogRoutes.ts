import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BlogRepository } from '../repositories/blogRepository';
import { uploadImageToCloudinary, deleteImageFromCloudinary, extractPublicIdFromUrl } from '../utils/imageUpload';
import { BlogResponse, CreateBlogRequest, UpdateBlogRequest } from '../types/blog';
import { asyncHandler } from '../middleware/errorHandler';

// Extend Express Request to include file property from multer
interface MulterRequest extends Request {
  file?: any;
}

const router = Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req: Request, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

/**
 * POST /api/blogs/upload-thumbnail
 * Upload a thumbnail image
 */
router.post(
  '/upload-thumbnail',
  upload.single('thumbnail'),
  asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
      });
      return;
    }

    // Convert buffer to base64 data URI for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await uploadImageToCloudinary(dataURI, 'blogs/thumbnails');

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  })
);

/**
 * POST /api/blogs/upload-banner
 * Upload a banner image
 */
router.post(
  '/upload-banner',
  upload.single('banner'),
  asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
      });
      return;
    }

    // Convert buffer to base64 data URI for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await uploadImageToCloudinary(dataURI, 'blogs/banners');

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  })
);

/**
 * POST /api/blogs
 * Create a new blog post
 * Body: { title, slug, category_id, author_id, keywords?, description, thumbnail_url?, banner_url?, is_popular?, status? }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, slug, category_id, author_id, keywords, description, thumbnail_url, banner_url, is_popular, status } = req.body;

    // Validate required fields
    if (!title || !slug || !category_id || !author_id || !description) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, slug, category_id, author_id, description',
      });
      return;
    }

    // Check if slug already exists
    const existingBlog = await BlogRepository.getBlogBySlug(slug);
    if (existingBlog) {
      res.status(400).json({
        success: false,
        error: 'Blog with this slug already exists',
      });
      return;
    }

    const blogData: CreateBlogRequest & { thumbnail_url?: string; banner_url?: string } = {
      title,
      slug,
      category_id,
      author_id,
      keywords,
      description,
      thumbnail_url,
      banner_url,
      is_popular: is_popular || false,
      status: status || 'ACTIVE',
    };

    const blog = await BlogRepository.createBlog(blogData);

    const response: BlogResponse = {
      success: true,
      data: blog,
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/blogs
 * Get all blogs with pagination
 * Query params: page (default: 1), limit (default: 10), category_id?, status?, is_popular?
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
      status: req.query.status as string | undefined,
      is_popular: req.query.is_popular === 'true' ? true : req.query.is_popular === 'false' ? false : undefined,
    };

    const { blogs, total } = await BlogRepository.getAllBlogs(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    const response: BlogResponse = {
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/blogs/popular
 * Get popular blogs
 * Query params: limit (default: 5)
 */
router.get(
  '/popular',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 5;
    const blogs = await BlogRepository.getPopularBlogs(limit);

    const response: BlogResponse = {
      success: true,
      data: blogs,
    };

    res.json(response);
  })
);

/**
 * GET /api/blogs/category/:categoryId
 * Get blogs by category
 * Query params: page (default: 1), limit (default: 10)
 */
router.get(
  '/category/:categoryId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid category ID',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { blogs, total } = await BlogRepository.getBlogsByCategory(categoryId, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: BlogResponse = {
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/blogs/search
 * Search blogs
 * Query params: q (search term), page (default: 1), limit (default: 10)
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

    const { blogs, total } = await BlogRepository.searchBlogs(searchTerm, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: BlogResponse = {
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/blogs/:id
 * Get blog by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
      return;
    }

    const blog = await BlogRepository.getBlogById(id);

    if (!blog) {
      res.status(404).json({
        success: false,
        error: 'Blog not found',
      });
      return;
    }

    const response: BlogResponse = {
      success: true,
      data: blog,
    };

    res.json(response);
  })
);

/**
 * GET /api/blogs/slug/:slug
 * Get blog by slug
 */
router.get(
  '/slug/:slug',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const blog = await BlogRepository.getBlogBySlug(slug);

    if (!blog) {
      res.status(404).json({
        success: false,
        error: 'Blog not found',
      });
      return;
    }

    const response: BlogResponse = {
      success: true,
      data: blog,
    };

    res.json(response);
  })
);

/**
 * PUT /api/blogs/:id
 * Update blog post
 * Body: Partial blog data to update
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
      return;
    }

    const blog = await BlogRepository.getBlogById(id);

    if (!blog) {
      res.status(404).json({
        success: false,
        error: 'Blog not found',
      });
      return;
    }

    // If slug is being updated, check for duplicates
    if (req.body.slug && req.body.slug !== blog.slug) {
      const existingBlog = await BlogRepository.getBlogBySlug(req.body.slug);
      if (existingBlog) {
        res.status(400).json({
          success: false,
          error: 'Blog with this slug already exists',
        });
        return;
      }
    }

    const updateData: UpdateBlogRequest = req.body;
    const updatedBlog = await BlogRepository.updateBlog(id, updateData);

    if (!updatedBlog) {
      res.status(500).json({
        success: false,
        error: 'Failed to update blog',
      });
      return;
    }

    const response: BlogResponse = {
      success: true,
      data: updatedBlog,
    };

    res.json(response);
  })
);

/**
 * DELETE /api/blogs/:id
 * Delete blog post
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid blog ID',
      });
      return;
    }

    const blog = await BlogRepository.getBlogById(id);

    if (!blog) {
      res.status(404).json({
        success: false,
        error: 'Blog not found',
      });
      return;
    }

    // Delete images from Cloudinary if they exist
    if (blog.thumbnail_url) {
      const thumbnailPublicId = extractPublicIdFromUrl(blog.thumbnail_url);
      if (thumbnailPublicId) {
        await deleteImageFromCloudinary(thumbnailPublicId);
      }
    }

    if (blog.banner_url) {
      const bannerPublicId = extractPublicIdFromUrl(blog.banner_url);
      if (bannerPublicId) {
        await deleteImageFromCloudinary(bannerPublicId);
      }
    }

    const deleted = await BlogRepository.deleteBlog(id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete blog',
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Blog deleted successfully' },
    });
  })
);

export default router;
