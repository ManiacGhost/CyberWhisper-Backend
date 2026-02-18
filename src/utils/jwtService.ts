import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN';
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export interface DecodedToken extends TokenPayload {}

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = (process.env.JWT_EXPIRY as string) || '1h';

// Log configuration on startup
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set in environment. Using default value. Set JWT_SECRET in .env for production.');
}

/**
 * Generate JWT token for user
 * Expiration: 1 hour by default (configurable via JWT_EXPIRY env var)
 */
export function generateJWTToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY as any,
  });
  console.log(`✓ Generated JWT token with expiry: ${JWT_EXPIRY}`);
  return token;
}

/**
 * Get JWT expiration time in milliseconds from now
 */
export function getJWTExpiryMs(): number {
  const expiryStr = JWT_EXPIRY;
  const match = expiryStr.match(/(\d+)([smhd])/);
  if (!match) return 3600000; // default 1 hour
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  const multipliers: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
  };
  return num * (multipliers[unit] || 3600000);
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
