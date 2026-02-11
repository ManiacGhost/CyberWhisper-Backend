import { query } from '../config/database';
import { BrochureDownload } from '../types/brochureDownload';

export class BrochureDownloadRepository {
  /**
   * Get all brochure downloads with pagination
   */
  static async getAllDownloads(
    limit: number = 10,
    offset: number = 0,
    filters?: { email?: string; name?: string }
  ): Promise<{ downloads: BrochureDownload[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.email) {
        conditions.push(`LOWER(email) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.email}%`);
      }
      if (filters.name) {
        conditions.push(`LOWER(name) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.name}%`);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM brochure_downloads ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get downloads with pagination
    const downloadsQuery = `
      SELECT * FROM brochure_downloads 
      ${whereClause}
      ORDER BY downloaded_at DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(downloadsQuery, allParams);

    return { downloads: result.rows as BrochureDownload[], total };
  }

  /**
   * Get single download by ID
   */
  static async getDownloadById(id: number): Promise<BrochureDownload | null> {
    const result = await query('SELECT * FROM brochure_downloads WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as BrochureDownload) : null;
  }

  /**
   * Get downloads by email
   */
  static async getDownloadsByEmail(
    email: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ downloads: BrochureDownload[]; total: number }> {
    const emailPattern = `%${email}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM brochure_downloads WHERE LOWER(email) LIKE LOWER($1)',
      [emailPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM brochure_downloads 
       WHERE LOWER(email) LIKE LOWER($1)
       ORDER BY downloaded_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [emailPattern, limit, offset]
    );

    return { downloads: result.rows as BrochureDownload[], total };
  }

  /**
   * Get downloads by name
   */
  static async getDownloadsByName(
    name: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ downloads: BrochureDownload[]; total: number }> {
    const namePattern = `%${name}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM brochure_downloads WHERE LOWER(name) LIKE LOWER($1)',
      [namePattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM brochure_downloads 
       WHERE LOWER(name) LIKE LOWER($1)
       ORDER BY downloaded_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [namePattern, limit, offset]
    );

    return { downloads: result.rows as BrochureDownload[], total };
  }

  /**
   * Create a new brochure download record
   */
  static async createDownload(
    downloadData: Omit<BrochureDownload, 'id' | 'downloaded_at'>
  ): Promise<BrochureDownload> {
    const { name, email, mobile_number } = downloadData;

    const result = await query(
      `INSERT INTO brochure_downloads (
        name, email, mobile_number, downloaded_at
      ) VALUES (
        $1, $2, $3, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [name, email, mobile_number]
    );

    return result.rows[0] as BrochureDownload;
  }

  /**
   * Update a brochure download record
   */
  static async updateDownload(
    id: number,
    downloadData: Partial<Omit<BrochureDownload, 'id' | 'downloaded_at'>>
  ): Promise<BrochureDownload | null> {
    // First check if download exists
    const existing = await this.getDownloadById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const updateFields = ['name', 'email', 'mobile_number'] as const;

    updateFields.forEach((field) => {
      if (field in downloadData && downloadData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(downloadData[field]);
      }
    });

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    const updateQuery = `
      UPDATE brochure_downloads 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    return result.rows.length > 0 ? (result.rows[0] as BrochureDownload) : null;
  }

  /**
   * Delete a brochure download record
   */
  static async deleteDownload(id: number): Promise<boolean> {
    const result = await query('DELETE FROM brochure_downloads WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
