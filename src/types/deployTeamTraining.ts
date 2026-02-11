export interface DeployTeamTraining {
  id: number;
  full_name: string;
  work_email: string;
  phone_whatsapp: string;
  company_name: string;
  job_title: string;
  team_size: string;
  delivery_mode: string;
  timeline: string;
  track_certification: string;
  message_requirement: string;
  created_at: string;
  updated_at: string;
}

export interface DeployTeamTrainingResponse {
  success: boolean;
  data?: DeployTeamTraining | DeployTeamTraining[];
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
