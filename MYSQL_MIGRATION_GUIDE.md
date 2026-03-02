# PostgreSQL to MySQL Migration Guide

## Overview
You've successfully converted from PostgreSQL to MySQL/phpMyAdmin. This guide explains the key changes and how to create the proper table structure.

## Key Differences:

| PostgreSQL | MySQL |
|------------|-------|
| `SERIAL` | `INT AUTO_INCREMENT` |
| `BIGSERIAL` | `BIGINT AUTO_INCREMENT` |
| `TEXT[]` | `JSON` |
| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` ✓ (same) |
| `BOOLEAN` | `BOOLEAN` or `TINYINT(1)` ✓ (same) |
| Triggers/Functions | Use `ON UPDATE CURRENT_TIMESTAMP` instead |
| `REFERENCES public.table` | `REFERENCES table` |

## MySQL Table Creation Script

Run this in phpMyAdmin SQL console to create all tables properly:

```sql
-- Create course table first (referenced by batches)
CREATE TABLE IF NOT EXISTS course (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category_id INT,
  description TEXT,
  overview TEXT,
  instructor_id INT,
  price DECIMAL(10, 2) NOT NULL,
  discount_price DECIMAL(10, 2),
  rating DECIMAL(3, 2),
  level VARCHAR(50),
  duration VARCHAR(100),
  language VARCHAR(50),
  curriculum_overview TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_slug (slug),
  INDEX idx_course_category_id (category_id),
  INDEX idx_course_instructor_id (instructor_id),
  INDEX idx_course_status (status)
);

-- Create users_cw table
CREATE TABLE IF NOT EXISTS users_cw (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  address TEXT,
  biography TEXT,
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'USER',
  is_instructor BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
);

-- Create batches_cw table
CREATE TABLE IF NOT EXISTS batches_cw (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  program_name VARCHAR(255) NOT NULL,
  program_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL,
  max_students INT,
  enrolled_students INT DEFAULT 0,
  duration_weeks INT,
  instructor_id INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discount_price DECIMAL(10, 2),
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users_cw(id),
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED')),
  INDEX idx_batches_course_id (course_id),
  INDEX idx_batches_instructor_id (instructor_id),
  INDEX idx_batches_status (status),
  INDEX idx_batches_start_date (start_date)
);

-- Create gallery_cw table
CREATE TABLE IF NOT EXISTS gallery_cw (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  context TEXT,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  tags JSON,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gallery_context (context),
  INDEX idx_gallery_is_active (is_active),
  INDEX idx_gallery_sort_order (sort_order),
  INDEX idx_gallery_public_id (public_id),
  INDEX idx_gallery_created_at (created_at),
  INDEX idx_gallery_context_active (context, is_active)
);

-- Create get_quotes table
CREATE TABLE IF NOT EXISTS get_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  subject VARCHAR(500),
  message TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (status IN ('PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED')),
  INDEX idx_quotes_email (email),
  INDEX idx_quotes_status (status),
  INDEX idx_quotes_created_at (created_at)
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_newsletter_email (email),
  INDEX idx_newsletter_status (status)
);

-- Create otp_cw table
CREATE TABLE IF NOT EXISTS otp_cw (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP NULL,
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  CHECK (LENGTH(otp_code) = 6),
  INDEX idx_otp_email (email),
  INDEX idx_otp_code (otp_code),
  INDEX idx_otp_expires_at (expires_at),
  INDEX idx_otp_is_verified (is_verified)
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_cw(id) ON DELETE CASCADE,
  INDEX idx_user_skills_user_id (user_id)
);

-- Other tables (add as needed)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_enrollments_email (email)
);

CREATE TABLE IF NOT EXISTS batch_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches_cw(id) ON DELETE CASCADE,
  INDEX idx_batch_enrollments_email (email)
);

CREATE TABLE IF NOT EXISTS brochure_downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20),
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_brochure_email (email)
);

CREATE TABLE IF NOT EXISTS deploy_team_training (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(20),
  team_size INT,
  delivery_mode VARCHAR(100),
  timeline VARCHAR(100),
  track_certification BOOLEAN DEFAULT FALSE,
  message_requirement TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deploy_email (primary_contact_email)
);
```

## Steps to Apply:

### Option 1: Using phpMyAdmin
1. Open phpMyAdmin and select your `cyberwhisper` database
2. Click "SQL" tab
3. Copy the entire SQL script above
4. Paste it into the SQL editor
5. Click "Go" to execute

### Option 2: Using MySQL Command Line
```bash
mysql -h localhost -u root -p cyberwhisper < mysql_tables.sql
```

## Important Notes:

1. **`tags` Column**: Changed from PostgreSQL `TEXT[]` to MySQL `JSON`
   - Your code already handles JSON serialization/deserialization in `galleryRepository.ts`

2. **Auto-Increment**: MySQL auto-increment is automatic with `AUTO_INCREMENT PRIMARY KEY`
   - No need for sequences like in PostgreSQL

3. **Timestamps**: Use `ON UPDATE CURRENT_TIMESTAMP` instead of triggers
   - This automatically updates the timestamp on any UPDATE

4. **Foreign Keys**: Make sure all referenced tables exist before creating dependent tables
   - Order matters!

## Verification

After running the migrations, verify everything works:

```bash
# Test database connection
npm run dev

# Try the health check endpoints
curl http://localhost:3000/
curl http://localhost:3000/api/health
```

## Common Issues & Solutions

### Issue: "Failed to save image metadata to database"
**Solution**: Ensure `gallery_cw` table is created with proper columns and `id` is `BIGINT AUTO_INCREMENT`

### Issue: "Cannot find table 'tablename'"
**Solution**: Tables must be created in correct order (parent tables before dependent ones)

### Issue: Tags not stored/retrieved correctly
**Solution**: Verify `tags` column type is `JSON` and your code's serialization is working (check console logs)

## Testing the Fix

After applying these changes:

1. **Rebuild the project**:
   ```bash
   npm run build
   ```

2. **Run the server**:
   ```bash
   npm run dev
   ```

3. **Try uploading a gallery image**:
   - POST to `/api/gallery/upload` with form-data (image, title, optional context)
   - You should now see detailed error messages in console if anything fails

4. **Check database health**:
   - GET `/api/health` → should show `"status": "healthy"`

## Questions or Issues?

If you're still getting errors:
1. Check the console output for detailed error messages
2. Verify table structure in phpMyAdmin
3. Make sure all column names match exactly (case-sensitive in queries)
4. Ensure JSON column syntax is correct for your MySQL version (5.7.8+ required)
