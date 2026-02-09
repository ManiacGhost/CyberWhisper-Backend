import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export interface DecodedToken extends TokenPayload {}

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = (process.env.JWT_EXPIRY as string) || '24h';

/**
 * Generate JWT token for user
 */
export function generateJWTToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY as any,
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyJWTToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer " prefix
}

/**
 * Verify password
 */
export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return inputHash === storedHash;
}
