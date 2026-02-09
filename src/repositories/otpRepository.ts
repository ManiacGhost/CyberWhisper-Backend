import { query } from '../config/database';
import { OTP } from '../types/otp';

export class OTPRepository {
  /**
   * Create a new OTP for the given email
   * Invalidates any existing active OTPs for the same email
   */
  static async createOTP(email: string, otpCode: string, expiryMinutes: number = 10): Promise<OTP> {
    // Invalidate any previous OTPs for this email
    await query(
      `UPDATE otp_cw SET is_verified = TRUE WHERE email = $1 AND is_verified = FALSE`,
      [email]
    );

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const result = await query(
      `INSERT INTO otp_cw (email, otp_code, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, otpCode, expiresAt]
    );

    return result.rows[0] as OTP;
  }

  /**
   * Verify OTP - check if it matches and is not expired
   */
  static async verifyOTP(email: string, otpCode: string): Promise<{ valid: boolean; otp: OTP | null }> {
    const result = await query(
      `SELECT * FROM otp_cw 
       WHERE email = $1 AND otp_code = $2 AND is_verified = FALSE 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, otpCode]
    );

    if (result.rows.length === 0) {
      return { valid: false, otp: null };
    }

    const otp = result.rows[0] as OTP;

    // Check attempt count
    if (otp.attempt_count >= otp.max_attempts) {
      return { valid: false, otp };
    }

    return { valid: true, otp };
  }

  /**
   * Mark OTP as verified
   */
  static async markOTPAsVerified(id: number): Promise<OTP> {
    const result = await query(
      `UPDATE otp_cw 
       SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] as OTP;
  }

  /**
   * Increment attempt count for failed verification
   */
  static async incrementAttemptCount(id: number): Promise<OTP> {
    const result = await query(
      `UPDATE otp_cw 
       SET attempt_count = attempt_count + 1
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] as OTP;
  }

  /**
   * Get active OTP for email
   */
  static async getActiveOTP(email: string): Promise<OTP | null> {
    const result = await query(
      `SELECT * FROM otp_cw 
       WHERE email = $1 AND is_verified = FALSE 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email]
    );

    return result.rows.length > 0 ? (result.rows[0] as OTP) : null;
  }

  /**
   * Delete expired OTPs (cleanup)
   */
  static async deleteExpiredOTPs(): Promise<number> {
    const result = await query(
      `DELETE FROM otp_cw WHERE expires_at < CURRENT_TIMESTAMP`
    );

    return result.rowCount || 0;
  }

  /**
   * Get OTP by ID
   */
  static async getOTPById(id: number): Promise<OTP | null> {
    const result = await query(
      `SELECT * FROM otp_cw WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? (result.rows[0] as OTP) : null;
  }
}
