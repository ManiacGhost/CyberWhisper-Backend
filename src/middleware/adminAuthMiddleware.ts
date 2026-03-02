import { Request, Response, NextFunction } from 'express';
import { verifyJWTToken, extractTokenFromHeader, DecodedToken } from '../utils/jwtService';

export interface AuthRequest extends Request {
  user?: DecodedToken;
}

/**
 * Middleware to verify JWT authentication token
 * Token is passed in Authorization header: "Bearer <token>"
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authorization token is required',
      });
      return;
    }

    const decoded = verifyJWTToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during authentication',
    });
  }
};

/**
 * Middleware to verify admin role
 * Must be used after authMiddleware
 */
export const adminOnlyMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Only administrators can access this endpoint',
    });
    return;
  }

  next();
};

/**
 * Middleware to verify instructor role
 * Must be used after authMiddleware
 */
export const instructorOnlyMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Only instructors and administrators can access this endpoint',
    });
    return;
  }

  next();
};
