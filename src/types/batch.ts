export interface Batch {
  id: number;
  course_id: number;
  program_name: string;
  program_type: string;
  start_date: string; // ISO date format (YYYY-MM-DD)
  end_date: string; // ISO date format (YYYY-MM-DD)
  start_time: string; // HH:mm:ss format
  end_time: string; // HH:mm:ss format
  schedule_type: string;
  max_students: number;
  duration_weeks: number;
  instructor_id: number;
  price: number;
  discount_price?: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING';
  created_at?: string;
  updated_at?: string;
}

export interface CreateBatchRequest {
  course_id: number;
  program_name: string;
  program_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  schedule_type: string;
  max_students: number;
  duration_weeks: number;
  instructor_id: number;
  price: number;
  discount_price?: number;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING';
}

export interface UpdateBatchRequest {
  program_name?: string;
  program_type?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  schedule_type?: string;
  max_students?: number;
  duration_weeks?: number;
  instructor_id?: number;
  price?: number;
  discount_price?: number;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'UPCOMING';
}

export interface BatchResponse {
  success: boolean;
  data?: Batch | Batch[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
