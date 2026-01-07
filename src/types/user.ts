export interface User {
  id: number;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string;
  phone: string;
  password_hash: string;
  address: string | null;
  profile_image_url: string | null;
  biography: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  is_instructor: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

export interface UserSkill {
  id: number;
  user_id: number;
  skill: string;
  created_at: Date;
}

export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  title?: string;
  address?: string;
  biography?: string;
  linkedin_url?: string;
  github_url?: string;
  role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  is_instructor?: boolean;
  skills?: string[];
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  profile_image_url?: string;
  biography?: string;
  linkedin_url?: string;
  github_url?: string;
  role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  is_instructor?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateSkillRequest {
  user_id: number;
  skill: string;
}

export interface UserResponse {
  success: boolean;
  data?: User | User[];
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface SkillResponse {
  success: boolean;
  data?: UserSkill | UserSkill[];
  error?: string;
}

export interface ProfileImageUploadResponse {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}
