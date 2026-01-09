export interface Blog {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  author_id: number;
  keywords: string | null;
  content: string;
  thumbnail_url: string | null;
  banner_url: string | null;
  is_popular: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  created_at: Date;
  updated_at: Date;
  short_description: string | null;
  reading_time: string | null;
  image_alt_text: string | null;
  image_caption: string | null;
  publish_date: Date | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  meta_robots: 'INDEX' | 'NOINDEX';
  allow_comments: boolean;
  show_on_homepage: boolean;
  is_sticky: boolean;
}

export interface CreateBlogRequest {
  title: string;
  slug: string;
  category_id: number;
  author_id: number;
  content: string;
  keywords?: string;
  short_description?: string;
  reading_time?: string;
  thumbnail_url?: string;
  banner_url?: string;
  image_alt_text?: string;
  image_caption?: string;
  is_popular?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  publish_date?: Date;
  visibility?: 'PUBLIC' | 'PRIVATE';
  seo_title?: string;
  seo_description?: string;
  focus_keyword?: string;
  canonical_url?: string;
  meta_robots?: 'INDEX' | 'NOINDEX';
  allow_comments?: boolean;
  show_on_homepage?: boolean;
  is_sticky?: boolean;
}

export interface UpdateBlogRequest {
  title?: string;
  slug?: string;
  category_id?: number;
  author_id?: number;
  content?: string;
  keywords?: string;
  short_description?: string;
  reading_time?: string;
  thumbnail_url?: string;
  banner_url?: string;
  image_alt_text?: string;
  image_caption?: string;
  is_popular?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  publish_date?: Date;
  visibility?: 'PUBLIC' | 'PRIVATE';
  seo_title?: string;
  seo_description?: string;
  focus_keyword?: string;
  canonical_url?: string;
  meta_robots?: 'INDEX' | 'NOINDEX';
  allow_comments?: boolean;
  show_on_homepage?: boolean;
  is_sticky?: boolean;
}

export interface BlogResponse {
  success: boolean;
  data?: Blog | Blog[];
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ImageUploadResponse {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}
