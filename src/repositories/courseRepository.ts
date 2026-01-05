import { query } from '../config/database';
import { Course } from '../types/course';

export class CourseRepository {
  /**
   * Get all courses with optional pagination and filtering
   */
  static async getAllCourses(
    limit: number = 10,
    offset: number = 0,
    filters?: { category_id?: number; status?: string; level?: string }
  ): Promise<{ courses: Course[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.category_id) {
        conditions.push(`category_id = $${paramIndex++}`);
        params.push(filters.category_id);
      }
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      if (filters.level) {
        conditions.push(`"level" = $${paramIndex++}`);
        params.push(filters.level);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM public.course ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get courses with pagination
    const coursesQuery = `
      SELECT * FROM public.course 
      ${whereClause}
      ORDER BY date_added DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(coursesQuery, allParams);

    return { courses: result.rows as Course[], total };
  }

  /**
   * Get course by ID
   */
  static async getCourseById(id: number): Promise<Course | null> {
    const result = await query('SELECT * FROM public.course WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Course) : null;
  }

  /**
   * Get courses by category ID
   */
  static async getCoursesByCategory(
    categoryId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM public.course WHERE category_id = $1',
      [categoryId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE category_id = $1 
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $2 OFFSET $3`,
      [categoryId, limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }

  /**
   * Get courses by creator/user ID
   */
  static async getCoursesByCreator(
    creatorId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM public.course WHERE creator = $1',
      [creatorId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE creator = $1 
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $2 OFFSET $3`,
      [creatorId, limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }

  /**
   * Get top/featured courses
   */
  static async getTopCourses(limit: number = 10): Promise<Course[]> {
    const result = await query(
      `SELECT * FROM public.course 
       WHERE is_top_course = 1 
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $1`,
      [limit]
    );
    return result.rows as Course[];
  }

  /**
   * Get free courses
   */
  static async getFreeCourses(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM public.course WHERE is_free_course = 1'
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE is_free_course = 1 
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }

  /**
   * Search courses by title or description
   */
  static async searchCourses(
    searchTerm: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const searchPattern = `%${searchTerm}%`;

    const countResult = await query(
      `SELECT COUNT(*) as count FROM public.course 
       WHERE LOWER(title) LIKE LOWER($1) 
       OR LOWER(short_description) LIKE LOWER($1)`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE LOWER(title) LIKE LOWER($1) 
       OR LOWER(short_description) LIKE LOWER($1)
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }

  /**
   * Get courses by level
   */
  static async getCoursesByLevel(
    level: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM public.course WHERE "level" = $1',
      [level]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE "level" = $1 
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $2 OFFSET $3`,
      [level, limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }

  /**
   * Get published courses
   */
  static async getPublishedCourses(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    const countResult = await query(
      "SELECT COUNT(*) as count FROM public.course WHERE status = 'published'"
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM public.course 
       WHERE status = 'published'
       ORDER BY date_added DESC NULLS LAST 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { courses: result.rows as Course[], total };
  }
}
