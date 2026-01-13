import { query } from '../config/database';
import { Batch, CreateBatchRequest, UpdateBatchRequest } from '../types/batch';

export class BatchRepository {
  /**
   * Create a new batch
   */
  static async createBatch(data: CreateBatchRequest): Promise<Batch> {
    const {
      course_id,
      program_name,
      program_type,
      start_date,
      end_date,
      start_time,
      end_time,
      schedule_type,
      max_students,
      duration_weeks,
      instructor_id,
      price,
      discount_price,
      description,
      status = 'ACTIVE',
    } = data;

    const result = await query(
      `INSERT INTO batches_cw 
       (course_id, program_name, program_type, start_date, end_date, start_time, end_time, 
        schedule_type, max_students, duration_weeks, instructor_id, price, discount_price, 
        description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING *`,
      [
        course_id,
        program_name,
        program_type,
        start_date,
        end_date,
        start_time,
        end_time,
        schedule_type,
        max_students,
        duration_weeks,
        instructor_id,
        price,
        discount_price || null,
        description || null,
        status,
      ]
    );

    return result.rows[0] as Batch;
  }

  /**
   * Get all batches with pagination and filtering
   */
  static async getAllBatches(
    limit: number = 10,
    offset: number = 0,
    filters?: { course_id?: number; status?: string; instructor_id?: number }
  ): Promise<{ batches: Batch[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.course_id) {
        conditions.push(`course_id = $${paramIndex++}`);
        params.push(filters.course_id);
      }
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      if (filters.instructor_id) {
        conditions.push(`instructor_id = $${paramIndex++}`);
        params.push(filters.instructor_id);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM batches_cw ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get batches with pagination
    const batchesQuery = `
      SELECT * FROM batches_cw 
      ${whereClause}
      ORDER BY start_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(batchesQuery, allParams);

    return { batches: result.rows as Batch[], total };
  }

  /**
   * Get batch by ID
   */
  static async getBatchById(id: number): Promise<Batch | null> {
    const result = await query('SELECT * FROM batches_cw WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Batch) : null;
  }

  /**
   * Get batches by course ID
   */
  static async getBatchesByCourse(
    courseId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ batches: Batch[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM batches_cw WHERE course_id = $1',
      [courseId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM batches_cw 
       WHERE course_id = $1 
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [courseId, limit, offset]
    );

    return { batches: result.rows as Batch[], total };
  }

  /**
   * Get batches by instructor ID
   */
  static async getBatchesByInstructor(
    instructorId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ batches: Batch[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM batches_cw WHERE instructor_id = $1',
      [instructorId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM batches_cw 
       WHERE instructor_id = $1 
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [instructorId, limit, offset]
    );

    return { batches: result.rows as Batch[], total };
  }

  /**
   * Get active batches
   */
  static async getActiveBatches(limit: number = 10): Promise<Batch[]> {
    const result = await query(
      `SELECT * FROM batches_cw 
       WHERE status = 'ACTIVE' AND start_date >= CURRENT_DATE
       ORDER BY start_date ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows as Batch[];
  }

  /**
   * Update batch
   */
  static async updateBatch(id: number, data: UpdateBatchRequest): Promise<Batch | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.getBatchById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE batches_cw 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? (result.rows[0] as Batch) : null;
  }

  /**
   * Delete batch
   */
  static async deleteBatch(id: number): Promise<boolean> {
    const result = await query('DELETE FROM batches_cw WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Search batches by program name
   */
  static async searchBatches(
    searchTerm: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ batches: Batch[]; total: number }> {
    const countResult = await query(
      `SELECT COUNT(*) as count FROM batches_cw 
       WHERE program_name ILIKE $1 OR program_type ILIKE $1`,
      [`%${searchTerm}%`]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM batches_cw 
       WHERE program_name ILIKE $1 OR program_type ILIKE $1
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );

    return { batches: result.rows as Batch[], total };
  }
}
