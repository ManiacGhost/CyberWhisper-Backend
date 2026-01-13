-- Create batches table for managing course batches/sessions
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  program_name VARCHAR(255) NOT NULL,
  program_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL,
  max_students INTEGER,
  enrolled_students INTEGER DEFAULT 0,
  duration_weeks INTEGER,
  instructor_id INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discount_price DECIMAL(10, 2),
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_instructor_id ON batches(instructor_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_start_date ON batches(start_date);
