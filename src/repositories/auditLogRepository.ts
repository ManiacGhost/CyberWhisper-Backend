import { query } from '../config/database';

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_name: string | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string;
  user_agent: string;
  status: string;
  error_message: string | null;
  timestamp: Date;
}

export interface UserStatusHistory {
  id: number;
  user_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  ip_address: string;
  reason: string | null;
  timestamp: Date;
}

export interface ContentStatusHistory {
  id: number;
  content_type: string;
  content_id: number;
  content_title: string;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  ip_address: string;
  reason: string | null;
  timestamp: Date;
}

export class AuditLogRepository {
  /**
   * Get all audit logs with optional filters
   */
  static async getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      userId?: number;
      entityType?: string;
      entityId?: number;
      action?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      let whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters) {
        if (filters.userId) {
          whereConditions.push(`user_id = $${paramIndex++}`);
          params.push(filters.userId);
        }
        if (filters.entityType) {
          whereConditions.push(`entity_type = $${paramIndex++}`);
          params.push(filters.entityType);
        }
        if (filters.entityId) {
          whereConditions.push(`entity_id = $${paramIndex++}`);
          params.push(filters.entityId);
        }
        if (filters.action) {
          whereConditions.push(`action = $${paramIndex++}`);
          params.push(filters.action);
        }
        if (filters.status) {
          whereConditions.push(`status = $${paramIndex++}`);
          params.push(filters.status);
        }
        if (filters.startDate) {
          whereConditions.push(`timestamp >= $${paramIndex++}`);
          params.push(filters.startDate);
        }
        if (filters.endDate) {
          whereConditions.push(`timestamp <= $${paramIndex++}`);
          params.push(filters.endDate);
        }
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`;
      const countResult = await query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get logs with pagination
      const logsQuery = `
        SELECT * FROM audit_logs ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(limit, offset);

      const logsResult = await query(logsQuery, params);
      return { logs: logsResult.rows as AuditLog[], total };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    entityType: string,
    entityId: number,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY timestamp DESC
         LIMIT $3`,
        [entityType, entityId, limit]
      );
      return result.rows as AuditLog[];
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: number,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows as AuditLog[];
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      return [];
    }
  }

  /**
   * Get user status change history
   */
  static async getUserStatusHistory(
    userId: number,
    limit: number = 50
  ): Promise<UserStatusHistory[]> {
    try {
      const result = await query(
        `SELECT * FROM user_status_history 
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows as UserStatusHistory[];
    } catch (error) {
      console.error('Error fetching user status history:', error);
      return [];
    }
  }

  /**
   * Get content status change history
   */
  static async getContentStatusHistory(
    contentType: string,
    contentId: number,
    limit: number = 50
  ): Promise<ContentStatusHistory[]> {
    try {
      const result = await query(
        `SELECT * FROM content_status_history 
         WHERE content_type = $1 AND content_id = $2
         ORDER BY timestamp DESC
         LIMIT $3`,
        [contentType, contentId, limit]
      );
      return result.rows as ContentStatusHistory[];
    } catch (error) {
      console.error('Error fetching content status history:', error);
      return [];
    }
  }

  /**
   * Get activity summary for dashboard
   */
  static async getActivitySummary(daysBack: number = 7): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByEntity: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get total actions
      const totalResult = await query(
        `SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= $1`,
        [startDate]
      );
      const totalActions = parseInt(totalResult.rows[0].count);

      // Get actions by type
      const byTypeResult = await query(
        `SELECT action, COUNT(*) as count FROM audit_logs 
         WHERE timestamp >= $1
         GROUP BY action`,
        [startDate]
      );
      const actionsByType: Record<string, number> = {};
      byTypeResult.rows.forEach((row: any) => {
        actionsByType[row.action] = parseInt(row.count);
      });

      // Get actions by entity
      const byEntityResult = await query(
        `SELECT entity_type, COUNT(*) as count FROM audit_logs 
         WHERE timestamp >= $1
         GROUP BY entity_type`,
        [startDate]
      );
      const actionsByEntity: Record<string, number> = {};
      byEntityResult.rows.forEach((row: any) => {
        actionsByEntity[row.entity_type] = parseInt(row.count);
      });

      // Get recent activity
      const recentResult = await query(
        `SELECT * FROM audit_logs 
         WHERE timestamp >= $1
         ORDER BY timestamp DESC
         LIMIT 20`,
        [startDate]
      );
      const recentActivity = recentResult.rows as AuditLog[];

      return {
        totalActions,
        actionsByType,
        actionsByEntity,
        recentActivity,
      };
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        actionsByEntity: {},
        recentActivity: [],
      };
    }
  }

  /**
   * Delete old audit logs (older than specified days)
   */
  static async deleteOldLogs(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await query(
        `DELETE FROM audit_logs WHERE timestamp < $1`,
        [cutoffDate]
      );

      return result.affectedRows || 0;
    } catch (error) {
      console.error('Error deleting old logs:', error);
      return 0;
    }
  }

  /**
   * Export audit logs for compliance/reporting
   */
  static async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    entityType?: string
  ): Promise<AuditLog[]> {
    try {
      let query_str = `SELECT * FROM audit_logs WHERE timestamp >= $1 AND timestamp <= $2`;
      const params: any[] = [startDate, endDate];

      if (entityType) {
        query_str += ` AND entity_type = $3`;
        params.push(entityType);
      }

      query_str += ` ORDER BY timestamp DESC`;

      const result = await query(query_str, params);
      return result.rows as AuditLog[];
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return [];
    }
  }
}
