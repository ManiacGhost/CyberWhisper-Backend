export interface NewsletterSubscriber {
  id: number;
  email: string;
  created_at: Date;
}

export interface SubscribeRequest {
  email: string;
}

export interface SendNewsletterRequest {
  subject: string;
  content: string; // HTML content
  plainText?: string; // Plain text version
}

export interface SendNewsletterResponse {
  success: boolean;
  message: string;
  data?: {
    totalSubscribers: number;
    sentCount: number;
    failedCount: number;
    failedEmails?: string[];
  };
  error?: string;
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
