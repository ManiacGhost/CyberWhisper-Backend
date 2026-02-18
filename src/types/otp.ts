export interface OTP {
  id: number;
  email: string;
  otp_code: string;
  is_verified: boolean;
  created_at: Date;
  expires_at: Date;
  verified_at: Date | null;
  attempt_count: number;
  max_attempts: number;
}

export interface CreateOTPRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp_code: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message?: string;
  data?: {
    requiresOTP: boolean;
    sessionId?: string;
    email?: string;
  };
  error?: string;
}

export interface AdminOTPVerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    token?: string;
    expiresAt?: string;
    expiresIn?: number;
    user?: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
    };
  };
  error?: string;
}
