export interface BrochureDownload {
  id: number;
  name: string;
  email: string;
  mobile_number: string;
  downloaded_at: string;
}

export interface BrochureDownloadResponse {
  success: boolean;
  data?: BrochureDownload | BrochureDownload[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
