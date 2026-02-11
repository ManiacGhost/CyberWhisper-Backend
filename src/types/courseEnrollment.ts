export interface CourseEnrollment {
  id: number;
  course_name: string;
  name: string;
  email: string;
  phone_number: string;
  enrolled_at: string;
}

export interface CourseEnrollmentResponse {
  success: boolean;
  data?: CourseEnrollment | CourseEnrollment[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
