import { Router, Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { OTPRepository } from '../repositories/otpRepository';
import { asyncHandler } from '../middleware/errorHandler';
import { AdminLoginRequest, AdminLoginResponse, AdminOTPVerifyResponse, VerifyOTPRequest } from '../types/otp';
import { sendOTPToAdmin, verifyOTPCode, handleFailedOTPAttempt } from '../utils/otpService';
import { generateJWTToken, verifyPassword, getJWTExpiryMs } from '../utils/jwtService';

const router = Router();

/**
 * POST /api/admin/login
 * Admin login with email and password
 * Returns: { success, message, data: { requiresOTP, sessionId, email } }
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as AdminLoginRequest;

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

      // Check if user has admin access (admin, superadmin, instructor, or student)
      if (!['ADMIN', 'SUPERADMIN', 'INSTRUCTOR', 'STUDENT'].includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'User does not have access to this endpoint',
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

      // Send OTP to admin email
      const otpResult = await sendOTPToAdmin(email);

      if (!otpResult.success) {
        res.status(500).json({
          success: false,
          error: otpResult.message,
        });
        return;
      }

      // Return success response with temporary session
      const response: AdminLoginResponse = {
        success: true,
        message: 'Credentials verified. OTP has been sent to your email.',
        data: {
          requiresOTP: true,
          email,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error during admin login:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during login',
      });
    }
  })
);

/**
 * POST /api/admin/verify-otp
 * Verify OTP and return authentication token
 * Body: { email, otp_code }
 */
router.post(
  '/verify-otp',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, otp_code } = req.body as VerifyOTPRequest;

    // Validate input
    if (!email || !otp_code) {
      res.status(400).json({
        success: false,
        error: 'Email and OTP code are required',
      });
      return;
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp_code)) {
      res.status(400).json({
        success: false,
        error: 'OTP must be 6 digits',
      });
      return;
    }

    try {
      // Get user by email
      const user = await UserRepository.getUserByEmail(email);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Check if user has admin access (admin, superadmin, instructor, or student)
      if (!['ADMIN', 'SUPERADMIN', 'INSTRUCTOR', 'STUDENT'].includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'User does not have access to this endpoint',
        });
        return;
      }

      // Verify OTP
      const { valid, message } = await verifyOTPCode(email, otp_code);

      if (!valid) {
        // Increment failed attempt counter
        await handleFailedOTPAttempt(email);

        res.status(401).json({
          success: false,
          error: message,
        });
        return;
      }

      // Generate JWT token
      const token = generateJWTToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      });

      // Get token expiration time (in milliseconds from now)
      const expiresIn = getJWTExpiryMs();
      const expiresAt = new Date(Date.now() + expiresIn);

      const response: AdminOTPVerifyResponse = {
        success: true,
        message: 'OTP verified successfully. You are now logged in.',
        data: {
          token,
          expiresAt: expiresAt.toISOString(),
          expiresIn,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
          },
        },
      };

      console.log(`\u2713 User ${email} logged in. Token expires at: ${expiresAt}`);
      res.json(response);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred during OTP verification',
      });
    }
  })
);

/**
 * POST /api/admin/resend-otp
 * Resend OTP to admin email
 * Body: { email }
 */
router.post(
  '/resend-otp',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    // Validate input
    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    try {
      // Get user by email
      const user = await UserRepository.getUserByEmail(email);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Check if user has admin access (admin, superadmin, instructor, or student)
      if (!['ADMIN', 'SUPERADMIN', 'INSTRUCTOR', 'STUDENT'].includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'User does not have access to this endpoint',
        });
        return;
      }

      // Send OTP
      const otpResult = await sendOTPToAdmin(email);

      if (!otpResult.success) {
        res.status(500).json({
          success: false,
          error: otpResult.message,
        });
        return;
      }

      res.json({
        success: true,
        message: otpResult.message,
      });
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while resending OTP',
      });
    }
  })
);

/**
 * GET /api/admin/otp-status/:email
 * Check OTP expiry status
 */
router.get(
  '/otp-status/:email',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params as { email: string };

    try {
      const activeOTP = await OTPRepository.getActiveOTP(email);

      if (!activeOTP) {
        res.status(404).json({
          success: false,
          error: 'No active OTP found',
        });
        return;
      }

      const expiresIn = Math.floor((activeOTP.expires_at.getTime() - Date.now()) / 1000);
      const attemptsLeft = activeOTP.max_attempts - activeOTP.attempt_count;

      res.json({
        success: true,
        data: {
          expiresIn: Math.max(0, expiresIn),
          expiresAt: activeOTP.expires_at,
          attemptsLeft: Math.max(0, attemptsLeft),
          isExpired: expiresIn <= 0,
          maxAttemptExceeded: attemptsLeft <= 0,
        },
      });
    } catch (error) {
      console.error('Error checking OTP status:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while checking OTP status',
      });
    }
  })
);

export default router;
