import { query } from '../config/database';
import { Blog, CreateBlogRequest, UpdateBlogRequest } from '../types/blog';

export class BlogRepository {
  /**
   * Create a new blog post
   */
  static async createBlog(data: CreateBlogRequest & { thumbnail_url?: string; banner_url?: string }): Promise<Blog> {
    const {
      title,
      slug,
      category_id,
      author_id,
      keywords,
      description,
      thumbnail_url,
      banner_url,
      is_popular = false,
      status = 'ACTIVE',
    } = data;

    const result = await query(
      `INSERT INTO blogs_CW (title, slug, category_id, author_id, keywords, description, thumbnail_url, banner_url, is_popular, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, slug, category_id, author_id, keywords || null, description, thumbnail_url || null, banner_url || null, is_popular, status]
    );

    return result.rows[0] as Blog;
  }

  /**
   * Get all blogs with pagination and filtering
   */
  static async getAllBlogs(
    limit: number = 10,
    offset: number = 0,
    filters?: { category_id?: number; status?: string; is_popular?: boolean }
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
      if (filters.is_popular !== undefined) {
        conditions.push(`is_popular = $${paramIndex++}`);
        params.push(filters.is_popular);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM blogs_CW ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get blogs with pagination
    const blogsQuery = `
      SELECT * FROM blogs_CW 
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
    const result = await query('SELECT * FROM blogs_CW WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Blog) : null;
  }

  /**
   * Get blog by slug
   */
  static async getBlogBySlug(slug: string): Promise<Blog | null> {
    const result = await query('SELECT * FROM blogs_CW WHERE slug = $1', [slug]);
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
      UPDATE blogs_CW 
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
    const result = await query('DELETE FROM blogs_CW WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get popular blogs
   */
  static async getPopularBlogs(limit: number = 5): Promise<Blog[]> {
    const result = await query(
      `SELECT * FROM blogs_CW WHERE is_popular = true AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows as Blog[];
  }

  /**
   * Get blogs by category
   */
  static async getBlogsByCategory(categoryId: number, limit: number = 10, offset: number = 0): Promise<{ blogs: Blog[]; total: number }> {
    const countResult = await query('SELECT COUNT(*) as count FROM blogs_CW WHERE category_id = $1 AND status = $2', [
      categoryId,
      'ACTIVE',
    ]);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM blogs_CW WHERE category_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [categoryId, 'ACTIVE', limit, offset]
    );

    return { blogs: result.rows as Blog[], total };
  }

  /**
   * Search blogs by title or keywords
   */
  static async searchBlogs(searchTerm: string, limit: number = 10, offset: number = 0): Promise<{ blogs: Blog[]; total: number }> {
    const searchPattern = `%${searchTerm}%`;

    const countResult = await query(
      `SELECT COUNT(*) as count FROM blogs_CW WHERE (title ILIKE $1 OR keywords ILIKE $1) AND status = $2`,
      [searchPattern, 'ACTIVE']
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM blogs_CW WHERE (title ILIKE $1 OR keywords ILIKE $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [searchPattern, 'ACTIVE', limit, offset]
    );

    return { blogs: result.rows as Blog[], total };
  }
}
