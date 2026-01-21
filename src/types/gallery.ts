export interface Gallery {
  id: number;
  title: string;
  context?: string | null;
  image_url: string;
  public_id: string;
  alt_text?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGalleryRequest {
  title: string;
  context?: string;
  alt_text?: string;
  tags?: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateGalleryRequest {
  title?: string;
  context?: string;
  alt_text?: string;
  tags?: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface GalleryFilters {
  context?: string;
  is_active?: boolean;
  search?: string;
}
