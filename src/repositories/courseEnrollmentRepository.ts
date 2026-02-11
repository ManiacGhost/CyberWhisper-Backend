import { query } from '../config/database';
import { CourseEnrollment } from '../types/courseEnrollment';

export class CourseEnrollmentRepository {
  /**
   * Get all course enrollments with pagination
   */
  static async getAllEnrollments(
    limit: number = 10,
    offset: number = 0,
    filters?: { course_name?: string; email?: string }
  ): Promise<{ enrollments: CourseEnrollment[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.course_name) {
        conditions.push(`LOWER(course_name) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.course_name}%`);
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
    const countQuery = `SELECT COUNT(*) as count FROM course_enrollments ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get enrollments with pagination
    const enrollmentsQuery = `
      SELECT * FROM course_enrollments 
      ${whereClause}
      ORDER BY enrolled_at DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(enrollmentsQuery, allParams);

    return { enrollments: result.rows as CourseEnrollment[], total };
  }

  /**
   * Get single enrollment by ID
   */
  static async getEnrollmentById(id: number): Promise<CourseEnrollment | null> {
    const result = await query('SELECT * FROM course_enrollments WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as CourseEnrollment) : null;
  }

  /**
   * Get enrollments by course name
   */
  static async getEnrollmentsByCourseName(
    courseName: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ enrollments: CourseEnrollment[]; total: number }> {
    const coursePattern = `%${courseName}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE LOWER(course_name) LIKE LOWER($1)',
      [coursePattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM course_enrollments 
       WHERE LOWER(course_name) LIKE LOWER($1)
       ORDER BY enrolled_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [coursePattern, limit, offset]
    );

    return { enrollments: result.rows as CourseEnrollment[], total };
  }

  /**
   * Get enrollments by email
   */
  static async getEnrollmentsByEmail(
    email: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ enrollments: CourseEnrollment[]; total: number }> {
    const emailPattern = `%${email}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE LOWER(email) LIKE LOWER($1)',
      [emailPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM course_enrollments 
       WHERE LOWER(email) LIKE LOWER($1)
       ORDER BY enrolled_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [emailPattern, limit, offset]
    );

    return { enrollments: result.rows as CourseEnrollment[], total };
  }

  /**
   * Create a new course enrollment record
   */
  static async createEnrollment(
    enrollmentData: Omit<CourseEnrollment, 'id' | 'enrolled_at'>
  ): Promise<CourseEnrollment> {
    const { course_name, name, email, phone_number } = enrollmentData;

    const result = await query(
      `INSERT INTO course_enrollments (
        course_name, name, email, phone_number, enrolled_at
      ) VALUES (
        $1, $2, $3, $4, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [course_name, name, email, phone_number]
    );

    return result.rows[0] as CourseEnrollment;
  }

  /**
   * Update a course enrollment record
   */
  static async updateEnrollment(
    id: number,
    enrollmentData: Partial<Omit<CourseEnrollment, 'id' | 'enrolled_at'>>
  ): Promise<CourseEnrollment | null> {
    // First check if enrollment exists
    const existing = await this.getEnrollmentById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const updateFields = ['course_name', 'name', 'email', 'phone_number'] as const;

    updateFields.forEach((field) => {
      if (field in enrollmentData && enrollmentData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(enrollmentData[field]);
      }
    });

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    const updateQuery = `
      UPDATE course_enrollments 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    return result.rows.length > 0 ? (result.rows[0] as CourseEnrollment) : null;
  }

  /**
   * Delete a course enrollment record
   */
  static async deleteEnrollment(id: number): Promise<boolean> {
    const result = await query('DELETE FROM course_enrollments WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
