export interface Quote {
  id: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  created_at: Date;
}

export interface CreateQuoteRequest {
  name: string;
  email: string;
  phone: string;
  message?: string;
}

export interface QuoteResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  created_at: Date;
}
