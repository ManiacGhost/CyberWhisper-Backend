import { query } from '../config/database';
import { BatchEnrollment, CreateBatchEnrollmentRequest } from '../types/batchEnrollment';

export class BatchEnrollmentRepository {
  /**
   * Create a new batch enrollment
   */
  static async createEnrollment(
    enrollmentData: CreateBatchEnrollmentRequest
  ): Promise<BatchEnrollment> {
    const { batch_id, name, email, phone_number } = enrollmentData;

    const result = await query(
      `INSERT INTO batch_enrollments (
        batch_id, name, email, phone_number, enrolled_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), NOW(), NOW()
      ) RETURNING *`,
      [batch_id, name, email, phone_number]
    );

    return result.rows[0] as BatchEnrollment;
  }

  /**
   * Get all batch enrollments with pagination
   */
  static async getAllEnrollments(
    limit: number = 10,
    offset: number = 0,
    filters?: { batch_id?: number; email?: string }
  ): Promise<{ enrollments: BatchEnrollment[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.batch_id) {
        conditions.push(`batch_id = $${paramIndex++}`);
        params.push(filters.batch_id);
      }
      if (filters.email) {
        conditions.push(`LOWER(email) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.email}%`);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM batch_enrollments ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get enrollments with pagination
    const enrollmentsQuery = `
      SELECT * FROM batch_enrollments 
      ${whereClause}
      ORDER BY enrolled_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(enrollmentsQuery, allParams);

    return { enrollments: result.rows as BatchEnrollment[], total };
  }

  /**
   * Get single enrollment by ID
   */
  static async getEnrollmentById(id: number): Promise<BatchEnrollment | null> {
    const result = await query('SELECT * FROM batch_enrollments WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as BatchEnrollment) : null;
  }

  /**
   * Get enrollments by batch ID
   */
  static async getEnrollmentsByBatchId(
    batchId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ enrollments: BatchEnrollment[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM batch_enrollments WHERE batch_id = $1',
      [batchId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM batch_enrollments 
       WHERE batch_id = $1
       ORDER BY enrolled_at DESC
       LIMIT $2 OFFSET $3`,
      [batchId, limit, offset]
    );

    return { enrollments: result.rows as BatchEnrollment[], total };
  }

  /**
   * Get enrollments by email
   */
  static async getEnrollmentsByEmail(
    email: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ enrollments: BatchEnrollment[]; total: number }> {
    const emailPattern = `%${email}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM batch_enrollments WHERE LOWER(email) LIKE LOWER($1)',
      [emailPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM batch_enrollments 
       WHERE LOWER(email) LIKE LOWER($1)
       ORDER BY enrolled_at DESC
       LIMIT $2 OFFSET $3`,
      [emailPattern, limit, offset]
    );

    return { enrollments: result.rows as BatchEnrollment[], total };
  }

  /**
   * Delete a batch enrollment
   */
  static async deleteEnrollment(id: number): Promise<boolean> {
    const result = await query('DELETE FROM batch_enrollments WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
