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
   * Fuzzy search courses by keywords across multiple fields
   * Searches in: title, short_description, description, outcomes
   */
  static async fuzzySearchCourses(
    keywords: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ courses: Course[]; total: number }> {
    // Create search patterns for fuzzy matching
    const keywordPattern = `%${keywords}%`;
    
    // Split keywords for word-by-word matching
    const keywordParts = keywords
      .toLowerCase()
      .split(/\s+/)
      .filter(k => k.length > 0);

    // Build LIKE conditions for each keyword part
    let whereConditions = [
      `LOWER(title) LIKE LOWER($1)`,
      `LOWER(short_description) LIKE LOWER($1)`,
      `LOWER(description) LIKE LOWER($1)`,
      `LOWER(outcomes) LIKE LOWER($1)`,
      `LOWER(section) LIKE LOWER($1)`,
      `LOWER(course_type) LIKE LOWER($1)`,
    ];

    // Add word-by-word matching for better fuzzy results
    const wordConditions = keywordParts.map((_, index) => {
      const paramIndex = 2 + index;
      return [
        `LOWER(title) LIKE LOWER($${paramIndex})`,
        `LOWER(short_description) LIKE LOWER($${paramIndex})`,
        `LOWER(description) LIKE LOWER($${paramIndex})`,
      ].join(' OR ');
    });

    if (wordConditions.length > 0) {
      whereConditions.push(`(${wordConditions.join(') OR (')})`);
    }

    const whereClause = whereConditions.join(' OR ');

    // Prepare parameters
    const params = [keywordPattern];
    keywordParts.forEach(kp => {
      params.push(`%${kp}%`);
    });

    // Count total results
    const countResult = await query(
      `SELECT COUNT(DISTINCT id) as count FROM public.course 
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get courses with pagination
    const result = await query(
      `SELECT * FROM public.course 
       WHERE ${whereClause}
       ORDER BY 
         CASE 
           WHEN LOWER(title) LIKE LOWER($1) THEN 1
           WHEN LOWER(short_description) LIKE LOWER($1) THEN 2
           ELSE 3
         END,
         date_added DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
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

  /**
   * Create a new course (Admin only)
   */
  static async createCourse(courseData: Partial<Course>): Promise<Course> {
    const {
      title,
      short_description,
      description,
      outcomes,
      faqs,
      language,
      category_id,
      sub_category_id,
      section,
      requirements,
      price,
      discount_flag,
      discounted_price,
      level,
      user_id,
      thumbnail,
      video_url,
      course_type,
      is_top_course,
      is_admin,
      status,
      course_overview_provider,
      meta_keywords,
      meta_description,
      is_free_course,
      multi_instructor,
      enable_drip_content,
      creator,
      expiry_period,
      upcoming_image_thumbnail,
      publish_date,
    } = courseData;

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const result = await query(
      `INSERT INTO public.course (
        title, short_description, description, outcomes, faqs, language,
        category_id, sub_category_id, section, requirements, price,
        discount_flag, discounted_price, level, user_id, thumbnail,
        video_url, date_added, course_type, is_top_course, is_admin,
        status, course_overview_provider, meta_keywords, meta_description,
        is_free_course, multi_instructor, enable_drip_content, creator,
        expiry_period, upcoming_image_thumbnail, publish_date, last_modified
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33
      ) RETURNING *`,
      [
        title || null,
        short_description || null,
        description || null,
        outcomes || null,
        faqs || '',
        language || null,
        category_id || null,
        sub_category_id || null,
        section || null,
        requirements || null,
        price || null,
        discount_flag || 0,
        discounted_price || null,
        level || null,
        user_id || null,
        thumbnail || null,
        video_url || null,
        currentTimestamp,
        course_type || null,
        is_top_course || 0,
        is_admin || null,
        status || 'draft',
        course_overview_provider || null,
        meta_keywords || null,
        meta_description || null,
        is_free_course || null,
        multi_instructor || 0,
        enable_drip_content || 0,
        creator || null,
        expiry_period || null,
        upcoming_image_thumbnail || null,
        publish_date || null,
        currentTimestamp,
      ]
    );

    return result.rows[0] as Course;
  }

  /**
   * Update a course (Admin only)
   */
  static async updateCourse(id: number, courseData: Partial<Course>): Promise<Course | null> {
    // First check if course exists
    const existing = await this.getCourseById(id);
    if (!existing) {
      return null;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    const updateFields: (keyof Course)[] = [
      'title',
      'short_description',
      'description',
      'outcomes',
      'faqs',
      'language',
      'category_id',
      'sub_category_id',
      'section',
      'requirements',
      'price',
      'discount_flag',
      'discounted_price',
      'level',
      'user_id',
      'thumbnail',
      'video_url',
      'course_type',
      'is_top_course',
      'is_admin',
      'status',
      'course_overview_provider',
      'meta_keywords',
      'meta_description',
      'is_free_course',
      'multi_instructor',
      'enable_drip_content',
      'creator',
      'expiry_period',
      'upcoming_image_thumbnail',
      'publish_date',
    ];

    updateFields.forEach((field) => {
      if (field in courseData && courseData[field] !== undefined) {
        const quotedField = field === 'language' || field === 'level' ? `"${field}"` : field;
        updates.push(`${quotedField} = $${paramIndex++}`);
        params.push(courseData[field]);
      }
    });

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`last_modified = $${paramIndex++}`);
    params.push(currentTimestamp);

    params.push(id);

    const updateQuery = `
      UPDATE public.course 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    return result.rows.length > 0 ? (result.rows[0] as Course) : null;
  }

  /**
   * Delete a course (Admin only)
   */
  static async deleteCourse(id: number): Promise<boolean> {
    const result = await query('DELETE FROM public.course WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
