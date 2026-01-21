import { query } from '../config/database';
import { Gallery, CreateGalleryRequest, UpdateGalleryRequest, GalleryFilters } from '../types/gallery';

export class GalleryRepository {
  /**
   * Create a new gallery image
   */
  static async createGalleryImage(
    imageUrl: string,
    publicId: string,
    data: CreateGalleryRequest
  ): Promise<Gallery> {
    const {
      title,
      context = null,
      alt_text = null,
      tags = null,
      is_active = true,
      sort_order = 0,
    } = data;

    const result = await query(
      `INSERT INTO gallery_cw (image_url, public_id, title, context, alt_text, tags, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [imageUrl, publicId, title, context, alt_text, tags, is_active, sort_order]
    );

    return result.rows[0] as Gallery;
  }

  /**
   * Get all gallery images with filtering and pagination
   */
  static async getAllGalleryImages(
    limit: number = 20,
    offset: number = 0,
    filters?: GalleryFilters
  ): Promise<{ images: Gallery[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.context) {
        conditions.push(`context ILIKE $${paramIndex++}`);
        params.push(`%${filters.context}%`);
      }
      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        params.push(filters.is_active);
      }
      if (filters.search) {
        conditions.push(`(title ILIKE $${paramIndex} OR context ILIKE $${paramIndex + 1} OR alt_text ILIKE $${paramIndex + 2})`);
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        paramIndex += 3;
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM gallery_cw ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const selectQuery = `
      SELECT * FROM gallery_cw
      ${whereClause}
      ORDER BY sort_order ASC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await query(selectQuery, [...params, limit, offset]);
    return {
      images: result.rows as Gallery[],
      total,
    };
  }

  /**
   * Get gallery images by context
   */
  static async getGalleryByContext(
    context: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ images: Gallery[]; total: number }> {
    const countResult = await query(
      `SELECT COUNT(*) FROM gallery_cw WHERE context ILIKE $1 AND is_active = true`,
      [`%${context}%`]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT * FROM gallery_cw
       WHERE context ILIKE $1 AND is_active = true
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${context}%`, limit, offset]
    );

    return {
      images: result.rows as Gallery[],
      total,
    };
  }

  /**
   * Get a single gallery image by ID
   */
  static async getGalleryImageById(id: number): Promise<Gallery | null> {
    const result = await query(`SELECT * FROM gallery_cw WHERE id = $1`, [id]);
    return (result.rows[0] as Gallery) || null;
  }

  /**
   * Update a gallery image
   */
  static async updateGalleryImage(
    id: number,
    data: UpdateGalleryRequest
  ): Promise<Gallery | null> {
    const fields = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.context !== undefined) {
      fields.push(`context = $${paramIndex++}`);
      params.push(data.context);
    }
    if (data.alt_text !== undefined) {
      fields.push(`alt_text = $${paramIndex++}`);
      params.push(data.alt_text);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      params.push(data.is_active);
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      params.push(data.sort_order);
    }

    if (fields.length === 0) {
      return this.getGalleryImageById(id);
    }

    fields.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE gallery_cw SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    return (result.rows[0] as Gallery) || null;
  }

  /**
   * Delete a gallery image
   */
  static async deleteGalleryImage(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM gallery_cw WHERE id = $1`, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get image by public ID
   */
  static async getGalleryImageByPublicId(publicId: string): Promise<Gallery | null> {
    const result = await query(`SELECT * FROM gallery_cw WHERE public_id = $1`, [publicId]);
    return (result.rows[0] as Gallery) || null;
  }

  /**
   * Reorder gallery images
   */
  static async reorderGalleryImages(imageOrders: Array<{ id: number; sort_order: number }>): Promise<boolean> {
    try {
      for (const item of imageOrders) {
        await query(`UPDATE gallery_cw SET sort_order = $1, updated_at = NOW() WHERE id = $2`, [
          item.sort_order,
          item.id,
        ]);
      }
      return true;
    } catch (error) {
      console.error('Error reordering gallery images:', error);
      return false;
    }
  }

  /**
   * Get all unique contexts
   */
  static async getAllContexts(): Promise<string[]> {
    const result = await query(`SELECT DISTINCT context FROM gallery_cw WHERE context IS NOT NULL ORDER BY context ASC`);
    return result.rows.map((row) => row.context);
  }
}
