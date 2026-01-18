export interface NewsletterSubscriber {
  id: number;
  email: string;
  created_at: Date;
}

export interface SubscribeRequest {
  email: string;
}

export interface NewsletterResponse {
  success: boolean;
  message: string;
  data?: NewsletterSubscriber;
  error?: string;
}

export interface ListSubscribersResponse {
  success: boolean;
  data: NewsletterSubscriber[];
  total: number;
  limit: number;
  offset: number;
}
