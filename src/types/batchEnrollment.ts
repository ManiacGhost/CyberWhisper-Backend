export interface BatchEnrollment {
  id: number;
  batch_id: number;
  name: string;
  email: string;
  phone_number: string;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchEnrollmentRequest {
  batch_id: number;
  name: string;
  email: string;
  phone_number: string;
}

export interface BatchEnrollmentResponse {
  success: boolean;
  data?: BatchEnrollment | BatchEnrollment[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
