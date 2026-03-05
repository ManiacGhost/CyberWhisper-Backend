import { Request } from 'express';
import { query } from '../config/database';

export interface AuditLogData {
  userId?: number;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  entityType: 'BLOG' | 'COURSE' | 'USER' | 'BATCH';
  entityId: number;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

export interface AuditLogWithRequest extends AuditLogData {
  req?: Request;
}

/**
 * Get client IP address from request
 */
export function getClientIp(req?: Request): string {
  if (!req) return 'UNKNOWN';

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'UNKNOWN';
}

/**
 * Get user agent from request
 */
export function getUserAgent(req?: Request): string {
  if (!req) return 'UNKNOWN';
  return req.headers['user-agent'] || 'UNKNOWN';
}

/**
 * Log an action to the audit log
 */
export async function logAudit(data: AuditLogWithRequest): Promise<boolean> {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      status = 'SUCCESS',
      errorMessage,
      req,
    } = data;

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await query(
      `INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, entity_name,
        old_values, new_values, ip_address, user_agent, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId || null,
        action,
        entityType,
        entityId,
        entityName || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        status,
        errorMessage || null,
      ]
    );

    console.log(`✓ Audit logged: ${action} ${entityType} #${entityId}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to log audit:', errorMessage);
    // Don't throw - audit logging should not break the main operation
    return false;
  }
}

/**
 * Log user status change (activate/deactivate)
 */
export async function logUserStatusChange(
  userId: number,
  oldStatus: string,
  newStatus: string,
  changedByUserId?: number,
  ipAddress?: string,
  reason?: string
): Promise<boolean> {
  try {
    await query(
      `INSERT INTO user_status_history (
        user_id, old_status, new_status, changed_by, ip_address, reason
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, oldStatus, newStatus, changedByUserId || null, ipAddress, reason || null]
    );

    console.log(
      `✓ User status logged: User #${userId} ${oldStatus} -> ${newStatus}`
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to log user status change:', errorMessage);
    return false;
  }
}

/**
 * Log content status change (blog/course publish, etc.)
 */
export async function logContentStatusChange(
  contentType: 'BLOG' | 'COURSE',
  contentId: number,
  contentTitle: string,
  oldStatus: string,
  newStatus: string,
  changedByUserId?: number,
  ipAddress?: string,
  reason?: string
): Promise<boolean> {
  try {
    await query(
      `INSERT INTO content_status_history (
        content_type, content_id, content_title, old_status, new_status, changed_by, ip_address, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        contentType,
        contentId,
        contentTitle,
        oldStatus,
        newStatus,
        changedByUserId || null,
        ipAddress,
        reason || null,
      ]
    );

    console.log(
      `✓ Content status logged: ${contentType} #${contentId} ${oldStatus} -> ${newStatus}`
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to log content status change:', errorMessage);
    return false;
  }
}

/**
 * Deep compare two objects and return only changed fields
 */
export function getChangedFields(
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): { oldValues: Record<string, any>; newValues: Record<string, any> } {
  const changes: Record<string, any> = {};
  const oldChanges: Record<string, any> = {};

  // Check for modified and new fields
  for (const key in newValues) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes[key] = newValues[key];
      oldChanges[key] = oldValues[key];
    }
  }

  return { oldValues: oldChanges, newValues: changes };
}
