import { query } from '../config/database';
import { DeployTeamTraining } from '../types/deployTeamTraining';

export class DeployTeamTrainingRepository {
  /**
   * Get all deploy team training requests with pagination
   */
  static async getAllRequests(
    limit: number = 10,
    offset: number = 0,
    filters?: { company_name?: string; delivery_mode?: string }
  ): Promise<{ requests: DeployTeamTraining[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.company_name) {
        conditions.push(`LOWER(company_name) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.company_name}%`);
      }
      if (filters.delivery_mode) {
        conditions.push(`delivery_mode = $${paramIndex++}`);
        params.push(filters.delivery_mode);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM deploy_team_training_requests ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get requests with pagination
    const requestsQuery = `
      SELECT * FROM deploy_team_training_requests 
      ${whereClause}
      ORDER BY created_at DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(requestsQuery, allParams);

    return { requests: result.rows as DeployTeamTraining[], total };
  }

  /**
   * Get single request by ID
   */
  static async getRequestById(id: number): Promise<DeployTeamTraining | null> {
    const result = await query(
      'SELECT * FROM deploy_team_training_requests WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as DeployTeamTraining) : null;
  }

  /**
   * Get requests by company name
   */
  static async getRequestsByCompany(
    companyName: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ requests: DeployTeamTraining[]; total: number }> {
    const searchPattern = `%${companyName}%`;

    const countResult = await query(
      'SELECT COUNT(*) as count FROM deploy_team_training_requests WHERE LOWER(company_name) LIKE LOWER($1)',
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM deploy_team_training_requests 
       WHERE LOWER(company_name) LIKE LOWER($1)
       ORDER BY created_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    return { requests: result.rows as DeployTeamTraining[], total };
  }

  /**
   * Get requests by delivery mode
   */
  static async getRequestsByDeliveryMode(
    deliveryMode: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ requests: DeployTeamTraining[]; total: number }> {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM deploy_team_training_requests WHERE delivery_mode = $1',
      [deliveryMode]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM deploy_team_training_requests 
       WHERE delivery_mode = $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [deliveryMode, limit, offset]
    );

    return { requests: result.rows as DeployTeamTraining[], total };
  }

  /**
   * Create a new training request
   */
  static async createRequest(
    requestData: Omit<DeployTeamTraining, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DeployTeamTraining> {
    const {
      full_name,
      work_email,
      phone_whatsapp,
      company_name,
      job_title,
      team_size,
      delivery_mode,
      timeline,
      track_certification,
      message_requirement,
    } = requestData;

    const result = await query(
      `INSERT INTO deploy_team_training_requests (
        full_name, work_email, phone_whatsapp, company_name, job_title,
        team_size, delivery_mode, timeline, track_certification, message_requirement,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        full_name,
        work_email,
        phone_whatsapp,
        company_name,
        job_title,
        team_size,
        delivery_mode,
        timeline,
        track_certification,
        message_requirement,
      ]
    );

    return result.rows[0] as DeployTeamTraining;
  }

  /**
   * Update a training request
   */
  static async updateRequest(
    id: number,
    requestData: Partial<Omit<DeployTeamTraining, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<DeployTeamTraining | null> {
    // First check if request exists
    const existing = await this.getRequestById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    const updateFields = [
      'full_name',
      'work_email',
      'phone_whatsapp',
      'company_name',
      'job_title',
      'team_size',
      'delivery_mode',
      'timeline',
      'track_certification',
      'message_requirement',
    ] as const;

    updateFields.forEach((field) => {
      if (field in requestData && requestData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(requestData[field]);
      }
    });

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const updateQuery = `
      UPDATE deploy_team_training_requests 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, params);
    return result.rows.length > 0 ? (result.rows[0] as DeployTeamTraining) : null;
  }

  /**
   * Delete a training request
   */
  static async deleteRequest(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM deploy_team_training_requests WHERE id = $1',
      [id]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
