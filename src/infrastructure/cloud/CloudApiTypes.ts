/** JSON shapes returned by mksflow-cloud `/api/v1` (snake_case). */

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_platform_admin?: boolean;
}

export interface ApiAuthResponse {
  user: ApiUser;
  token: string;
  expires_at: string | null;
}

export interface ApiProject {
  id: string;
  name: string;
  description?: string;
  mode: string;
  color?: string;
  owner_id: string;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  related_files: string[];
  acceptance_criteria: string[];
  assigned_to: string | null;
  created_by: string;
  time_tracked: number;
  timer_started_at: string | null;
  sort_order: number;
  external_id: string | null;
  external_source: string | null;
  pull_request_url?: string | null;
  agent_workflow_status?: string | null;
  current_iteration?: number | null;
  accepted_iteration?: number | null;
  attachments?: ApiTaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface ApiTaskAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface ApiTaskLog {
  id: string;
  action?: string;
  from_status: string | null;
  to_status: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface CloudCachePayload {
  user: ApiUser | null;
  projects: import('../../shared/messages').SerializedProject[];
  tasks: import('../../shared/messages').SerializedTask[];
  lastSyncAt: string | null;
}
