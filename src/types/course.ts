export interface Course {
  id: number;
  title: string | null;
  short_description: string | null;
  description: string | null;
  outcomes: string | null;
  faqs: string;
  language: string | null;
  category_id: number | null;
  sub_category_id: number | null;
  section: string | null;
  requirements: string | null;
  price: number | null;
  discount_flag: number;
  discounted_price: number | null;
  level: string | null;
  user_id: string | null;
  thumbnail: string | null;
  video_url: string | null;
  date_added: number | null;
  last_modified: number | null;
  course_type: string | null;
  is_top_course: number;
  is_admin: number | null;
  status: string | null;
  course_overview_provider: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
  is_free_course: number | null;
  multi_instructor: number;
  enable_drip_content: number;
  creator: number | null;
  expiry_period: number | null;
  upcoming_image_thumbnail: string | null;
  publish_date: string | null;
}

export interface CourseResponse {
  success: boolean;
  data?: Course | Course[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
