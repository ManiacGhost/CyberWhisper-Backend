import { query } from '../config/database';
import { Blog, CreateBlogRequest, UpdateBlogRequest } from '../types/blog';

export class BlogRepository {
  /**
   * Create a new blog post
   */
  static async createBlog(data: CreateBlogRequest): Promise<Blog> {
    const {
      title,
      slug,
      category_id,
      author_id,
      content,
      keywords,
      short_description,
      reading_time,
      thumbnail_url,
      banner_url,
      image_alt_text,
      image_caption,
      is_popular = false,
      status = 'DRAFT',
      publish_date,
      visibility = 'PUBLIC',
      seo_title,
      seo_description,
      focus_keyword,
      canonical_url,
      meta_robots = 'INDEX',
      allow_comments = true,
      show_on_homepage = true,
      is_sticky = false,
    } = data;

    const result = await query(
      `INSERT INTO blogs_cw (
        title, slug, category_id, author_id, content, keywords, short_description, 
        reading_time, thumbnail_url, banner_url, image_alt_text, image_caption, 
        is_popular, status, publish_date, visibility, seo_title, seo_description, 
        focus_keyword, canonical_url, meta_robots, allow_comments, show_on_homepage, is_sticky
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       RETURNING *`,
      [
        title, slug, category_id, author_id, content, keywords || null, short_description || null,
        reading_time || null, thumbnail_url || null, banner_url || null, image_alt_text || null, 
        image_caption || null, is_popular, status, publish_date || null, visibility, 
        seo_title || null, seo_description || null, focus_keyword || null, canonical_url || null, 
        meta_robots, allow_comments, show_on_homepage, is_sticky
      ]
    );

    return result.rows[0] as Blog;
  }

  /**
   * Get all blogs with pagination and filtering
   */
  static async getAllBlogs(
    limit: number = 10,
    offset: number = 0,
    filters?: { category_id?: number; status?: string; visibility?: string; is_popular?: boolean }
  ): Promise<{ blogs: Blog[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.category_id !== undefined) {
        conditions.push(`category_id = $${paramIndex++}`);
        params.push(filters.category_id);
      }
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      if (filters.visibility) {
        conditions.push(`visibility = $${paramIndex++}`);
        params.push(filters.visibility);
      }
      if (filters.is_popular !== undefined) {
        conditions.push(`is_popular = $${paramIndex++}`);
        params.push(filters.is_popular);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM blogs_cw ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get blogs with pagination
    const blogsQuery = `
      SELECT * FROM blogs_cw 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(blogsQuery, allParams);

    return { blogs: result.rows as Blog[], total };
  }

  /**
   * Get blog by ID
   */
  static async getBlogById(id: number): Promise<Blog | null> {
    const result = await query('SELECT * FROM blogs_cw WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Blog) : null;
  }

  /**
   * Get blog by slug
   */
  static async getBlogBySlug(slug: string): Promise<Blog | null> {
    const result = await query('SELECT * FROM blogs_cw WHERE slug = $1', [slug]);
    return result.rows.length > 0 ? (result.rows[0] as Blog) : null;
  }

  /**
   * Update blog post
   */
  static async updateBlog(id: number, data: UpdateBlogRequest): Promise<Blog | null> {
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
      return this.getBlogById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE blogs_cw 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);
    return result.rows.length > 0 ? (result.rows[0] as Blog) : null;
  }

  /**
   * Delete blog post
   */
  static async deleteBlog(id: number): Promise<boolean> {
    const result = await query('DELETE FROM blogs_cw WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get popular blogs
   */
  static async getPopularBlogs(limit: number = 5): Promise<Blog[]> {
    const result = await query(
      `SELECT * FROM blogs_cw WHERE is_popular = true AND status = 'PUBLISHED' AND visibility = 'PUBLIC' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows as Blog[];
  }

  /**
   * Get blogs by category
   */
  static async getBlogsByCategory(categoryId: number, limit: number = 10, offset: number = 0): Promise<{ blogs: Blog[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM blogs_cw WHERE category_id = $1 AND status = $2 AND visibility = $3',
      [categoryId, 'PUBLISHED', 'PUBLIC']
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM blogs_cw WHERE category_id = $1 AND status = $2 AND visibility = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      [categoryId, 'PUBLISHED', 'PUBLIC', limit, offset]
    );

    return { blogs: result.rows as Blog[], total };
  }

  /**
   * Search blogs by title or keywords
   */
  static async searchBlogs(searchTerm: string, limit: number = 10, offset: number = 0): Promise<{ blogs: Blog[]; total: number }> {
    const searchPattern = `%${searchTerm}%`;

    const countResult = await query(
      `SELECT COUNT(*) as count FROM blogs_cw WHERE (title ILIKE $1 OR keywords ILIKE $1) AND status = $2 AND visibility = $3`,
      [searchPattern, 'PUBLISHED', 'PUBLIC']
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM blogs_cw WHERE (title ILIKE $1 OR keywords ILIKE $1) AND status = $2 AND visibility = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      [searchPattern, 'PUBLISHED', 'PUBLIC', limit, offset]
    );

    return { blogs: result.rows as Blog[], total };
  }

  /**
   * Get sticky blogs
   */
  static async getStickyBlogs(limit: number = 5): Promise<Blog[]> {
    const result = await query(
      `SELECT * FROM blogs_cw WHERE is_sticky = true AND status = 'PUBLISHED' AND visibility = 'PUBLIC' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows as Blog[];
  }

  /**
   * Get homepage blogs
   */
  static async getHomepageBlogs(limit: number = 10): Promise<Blog[]> {
    const result = await query(
      `SELECT * FROM blogs_cw WHERE show_on_homepage = true AND status = 'PUBLISHED' AND visibility = 'PUBLIC' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows as Blog[];
  }
}
