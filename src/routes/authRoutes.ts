import { Router, Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { asyncHandler } from '../middleware/errorHandler';
import { generateJWTToken, verifyPassword } from '../utils/jwtService';
import { authMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';

const router = Router();

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Login for students and instructors
 * Returns JWT token (NO OTP for non-admin users)
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    try {
      // Get user by email
      const user = await UserRepository.getUserByEmail(email);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Admins and SuperAdmins should use /api/admin/login endpoint with OTP
      if (['ADMIN', 'SUPERADMIN'].includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'Administrators must use the admin login endpoint',
        });
        return;
      }

      // Check if user account is active
      if (user.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          error: 'This account is inactive',
        });
        return;
      }

      // Verify password
      if (!verifyPassword(password, user.password_hash)) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate JWT token
      const token = generateJWTToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'STUDENT' | 'INSTRUCTOR',
        firstName: user.first_name,
        lastName: user.last_name,
      });

      // Return success response with token
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            profile_image_url: user.profile_image_url,
          },
        },
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during login',
      });
    }
  })
);

/**
 * POST /api/auth/refresh-token
 * Refresh expired JWT token
 * Requires valid token in Authorization header
 */
router.post(
  '/refresh-token',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Generate new JWT token
      const newToken = generateJWTToken({
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while refreshing token',
      });
    }
  })
);

/**
 * GET /api/auth/profile
 * Get current user profile
 * Requires valid token in Authorization header
 */
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Get user details from database
      const user = await UserRepository.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while fetching profile',
      });
    }
  })
);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Token invalidation can be done on client side
      // In a production system, you might maintain a token blacklist
      res.json({
        success: true,
        message: 'Logged out successfully. Please remove the token from client.',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during logout',
      });
    }
  })
);

export default router;
