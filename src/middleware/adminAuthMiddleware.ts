import { Request, Response, NextFunction } from 'express';

export interface AdminRequest extends Request {
  admin?: {
    userId: number;
    email: string;
    role: string;
    iat: number;
    exp: number;
  };
}

/**
 * Middleware to verify admin authentication token
 * Token is passed in Authorization header: "Bearer <token>"
 */
export const adminAuthMiddleware = (req: AdminRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization token is required',
      });
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Decode token (it's base64 encoded JSON)
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      // Check token expiration
      if (decoded.exp * 1000 < Date.now()) {
        res.status(401).json({
          success: false,
          error: 'Token has expired',
        });
        return;
      }

      // Verify role is ADMIN
      if (decoded.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Only administrators can access this endpoint',
        });
        return;
      }

      // Attach admin info to request
      req.admin = decoded;
      next();
    } catch (parseError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }
  } catch (error) {
    console.error('Error in admin auth middleware:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during authentication',
    });
  }
};

/**
 * Middleware to verify user is authenticated (no specific role required)
 */
export const authMiddleware = (req: AdminRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization token is required',
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      // Check token expiration
      if (decoded.exp * 1000 < Date.now()) {
        res.status(401).json({
          success: false,
          error: 'Token has expired',
        });
        return;
      }

      req.admin = decoded;
      next();
    } catch (parseError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during authentication',
    });
  }
};
