-- Create audit_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL COMMENT 'CREATE, READ, UPDATE, DELETE, ACTIVATE, DEACTIVATE',
  entity_type VARCHAR(50) NOT NULL COMMENT 'BLOG, COURSE, USER, BATCH, etc.',
  entity_id INT NOT NULL,
  entity_name VARCHAR(255),
  old_values JSON COMMENT 'Previous values for UPDATE operations',
  new_values JSON COMMENT 'New values for CREATE/UPDATE operations',
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  status VARCHAR(20) DEFAULT 'SUCCESS' COMMENT 'SUCCESS, FAILED',
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp),
  INDEX idx_entity_type_id (entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users_cw(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trigger to automatically update timestamp on update
DROP TRIGGER IF EXISTS update_audit_logs_timestamp;
CREATE TRIGGER update_audit_logs_timestamp
BEFORE UPDATE ON audit_logs
FOR EACH ROW
SET NEW.timestamp = CURRENT_TIMESTAMP;

-- Create table to track user activation/deactivation history
CREATE TABLE IF NOT EXISTS user_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by INT COMMENT 'User ID who made the change',
  ip_address VARCHAR(45),
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  FOREIGN KEY (user_id) REFERENCES users_cw(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users_cw(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table to track course and blog visibility/status changes
CREATE TABLE IF NOT EXISTS content_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL COMMENT 'BLOG, COURSE',
  content_id INT NOT NULL,
  content_title VARCHAR(255),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT COMMENT 'User ID who made the change',
  ip_address VARCHAR(45),
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_content_type_id (content_type, content_id),
  INDEX idx_timestamp (timestamp),
  FOREIGN KEY (changed_by) REFERENCES users_cw(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
