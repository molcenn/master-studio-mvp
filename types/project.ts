export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = Project['status'];

export interface CreateProjectInput {
  name: string;
  description: string;
  status?: ProjectStatus;
}
