import { Router, Request, Response } from 'express';
import multer from 'multer';
import { UserRepository } from '../repositories/userRepository';
import { SkillRepository } from '../repositories/skillRepository';
import { uploadImageToCloudinary, deleteImageFromCloudinary, extractPublicIdFromUrl } from '../utils/imageUpload';
import { UserResponse, CreateUserRequest, UpdateUserRequest } from '../types/user';
import { asyncHandler } from '../middleware/errorHandler';

interface MulterRequest extends Request {
  file?: any;
}

const router = Router();

// Configure multer for profile image uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profiles
  fileFilter: (_req: Request, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * POST /api/users/upload-profile
 * Upload a profile image
 */
router.post(
  '/upload-profile',
  upload.single('profile'),
  asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
      });
      return;
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await uploadImageToCloudinary(dataURI, 'users/profiles');

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  })
);

/**
 * POST /api/users
 * Create a new user
 * Body: { first_name, last_name, email, phone, password, title?, address?, biography?, linkedin_url?, github_url?, role?, is_instructor?, profile_image_url?, skills?: [] }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { first_name, last_name, email, phone, password, title, address, biography, linkedin_url, github_url, role, is_instructor, profile_image_url, skills } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: first_name, last_name, email, phone, password',
      });
      return;
    }

    // Check if email already exists
    const existingEmail = await UserRepository.getUserByEmail(email);
    if (existingEmail) {
      res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
      return;
    }

    // Check if phone already exists
    const existingPhone = await UserRepository.getUserByPhone(phone);
    if (existingPhone) {
      res.status(400).json({
        success: false,
        error: 'Phone number already registered',
      });
      return;
    }

    const userData: CreateUserRequest & { profile_image_url?: string } = {
      first_name,
      last_name,
      email,
      phone,
      password,
      title,
      address,
      biography,
      linkedin_url,
      github_url,
      role: role || 'STUDENT',
      is_instructor: is_instructor || false,
      profile_image_url,
    };

    const user = await UserRepository.createUser(userData);

    // Add skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      for (const skill of skills) {
        if (skill && skill.trim()) {
          await SkillRepository.addSkill({
            user_id: user.id,
            skill: skill.trim(),
          });
        }
      }
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    const response: UserResponse = {
      success: true,
      data: userWithoutPassword as any,
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/users
 * Get all users with pagination
 * Query params: page (default: 1), limit (default: 10), role?, status?, is_instructor?
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
      is_instructor: req.query.is_instructor === 'true' ? true : req.query.is_instructor === 'false' ? false : undefined,
    };

    const { users, total } = await UserRepository.getAllUsers(limit, offset, filters);
    const pages = Math.ceil(total / limit);

    const response: UserResponse = {
      success: true,
      data: users.map(({ password_hash, ...user }) => user) as any,
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
 * GET /api/users/instructors
 * Get all instructors
 * Query params: page (default: 1), limit (default: 10)
 */
router.get(
  '/instructors',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { users, total } = await UserRepository.getInstructors(limit, offset);
    const pages = Math.ceil(total / limit);

    const response: UserResponse = {
      success: true,
      data: users.map(({ password_hash, ...user }) => user) as any,
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
 * GET /api/users/search
 * Search users by name or email
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

    const { users, total } = await UserRepository.searchUsers(searchTerm, limit, offset);
    const pages = Math.ceil(total / limit);

    const response: UserResponse = {
      success: true,
      data: users.map(({ password_hash, ...user }) => user) as any,
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
 * GET /api/users/:id
 * Get user by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    const user = await UserRepository.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const { password_hash, ...userWithoutPassword } = user;

    const response: UserResponse = {
      success: true,
      data: userWithoutPassword as any,
    };

    res.json(response);
  })
);

/**
 * POST /api/users/:id/update
 * Update user
 * Body: Partial user data to update
 */
router.post(
  '/:id/update',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    const user = await UserRepository.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if new email is unique (if being updated)
    if (req.body.email && req.body.email !== user.email) {
      const existingEmail = await UserRepository.getUserByEmail(req.body.email);
      if (existingEmail) {
        res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
        return;
      }
    }

    // Check if new phone is unique (if being updated)
    if (req.body.phone && req.body.phone !== user.phone) {
      const existingPhone = await UserRepository.getUserByPhone(req.body.phone);
      if (existingPhone) {
        res.status(400).json({
          success: false,
          error: 'Phone number already registered',
        });
        return;
      }
    }

    // If updating profile image, delete old one from Cloudinary
    if (req.body.profile_image_url && user.profile_image_url) {
      const oldPublicId = extractPublicIdFromUrl(user.profile_image_url);
      if (oldPublicId) {
        await deleteImageFromCloudinary(oldPublicId);
      }
    }

    const updateData: UpdateUserRequest = req.body;
    const updatedUser = await UserRepository.updateUser(id, updateData);

    if (!updatedUser) {
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
      return;
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;

    const response: UserResponse = {
      success: true,
      data: userWithoutPassword as any,
    };

    res.json(response);
  })
);

/**
 * DELETE /api/users/:id
 * Delete user and all associated skills
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    const user = await UserRepository.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Delete profile image from Cloudinary if it exists
    if (user.profile_image_url) {
      const publicId = extractPublicIdFromUrl(user.profile_image_url);
      if (publicId) {
        await deleteImageFromCloudinary(publicId);
      }
    }

    const deleted = await UserRepository.deleteUser(id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  })
);

export default router;
