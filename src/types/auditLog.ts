export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
export type AuditEntityType = 'BLOG' | 'COURSE' | 'USER' | 'BATCH';

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number;
  entity_name: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILED';
  error_message: string | null;
  timestamp: Date;
}
