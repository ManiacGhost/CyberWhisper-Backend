export interface Blog {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  author_id: number;
  keywords: string | null;
  description: string;
  thumbnail_url: string | null;
  banner_url: string | null;
  is_popular: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

export interface CreateBlogRequest {
  title: string;
  slug: string;
  category_id: number;
  author_id: number;
  keywords?: string;
  description: string;
  is_popular?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBlogRequest {
  title?: string;
  slug?: string;
  category_id?: number;
  author_id?: number;
  keywords?: string;
  description?: string;
  thumbnail_url?: string;
  banner_url?: string;
  is_popular?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
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
