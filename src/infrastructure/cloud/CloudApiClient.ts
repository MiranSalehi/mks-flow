import { getApiBaseUrl } from '../../shared/cloudConfig';
import type {
  ApiAuthResponse,
  ApiProject,
  ApiTask,
  ApiTaskLog,
  ApiUser,
} from './CloudApiTypes';
import { CloudApiError } from './CloudApiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Thin HTTP client for mksflow-cloud REST API v1.
 */
export class CloudApiClient {
  private token: string | null = null;

  /** Sets the Bearer token used for authenticated requests. */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Returns the current Bearer token, if any. */
  getToken(): string | null {
    return this.token;
  }

  /** Registers a new user and returns auth payload. */
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<ApiAuthResponse> {
    return this.request<ApiAuthResponse>('POST', '/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
    });
  }

  /** Logs in and returns auth payload. */
  async login(email: string, password: string): Promise<ApiAuthResponse> {
    return this.request<ApiAuthResponse>('POST', '/auth/login', {
      email,
      password,
    });
  }

  /** Revokes the current access token. */
  async logout(): Promise<void> {
    await this.request('POST', '/auth/logout');
  }

  /** Returns the authenticated user profile. */
  async me(): Promise<ApiUser> {
    return this.request<ApiUser>('GET', '/auth/me');
  }

  /** Lists team projects accessible to the user. */
  async listTeamProjects(): Promise<ApiProject[]> {
    return this.request<ApiProject[]>('GET', '/projects?mode=team');
  }

  /** Lists tasks in projects accessible to the current user. */
  async listTasks(options?: {
    projectId?: string;
    assignedToMe?: boolean;
  }): Promise<ApiTask[]> {
    const params = new URLSearchParams();
    if (options?.projectId) {
      params.set('project_id', options.projectId);
    }
    if (options?.assignedToMe) {
      params.set('assigned_to', 'me');
    }
    const query = params.toString();
    return this.request<ApiTask[]>(
      'GET',
      query ? `/tasks?${query}` : '/tasks',
    );
  }

  /** @deprecated Prefer {@link listTasks} — only returns tasks assigned to the user. */
  async listMyTasks(): Promise<ApiTask[]> {
    return this.listTasks({ assignedToMe: true });
  }

  /** Updates a task. */
  async updateTask(
    taskId: string,
    body: Record<string, unknown>,
  ): Promise<ApiTask> {
    return this.request<ApiTask>('PUT', `/tasks/${taskId}`, body);
  }

  /** Changes task status (server validates transitions and roles). */
  async changeTaskStatus(taskId: string, status: string): Promise<ApiTask> {
    return this.request<ApiTask>('PATCH', `/tasks/${taskId}/status`, {
      status,
    });
  }

  /** Reorders tasks within a column. */
  async reorderTasks(
    taskId: string,
    status: string,
    sortOrder: number,
    orderedIds: string[],
  ): Promise<void> {
    await this.request('PATCH', `/tasks/${taskId}/reorder`, {
      status,
      sort_order: sortOrder,
      ordered_ids: orderedIds,
    });
  }

  /** Returns audit logs for a task. */
  async getTaskLogs(taskId: string): Promise<ApiTaskLog[]> {
    return this.request<ApiTaskLog[]>('GET', `/tasks/${taskId}/logs`);
  }

  /** Downloads a task attachment (image/video) as raw bytes. */
  async fetchAttachment(
    taskId: string,
    attachmentId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const url = `${getApiBaseUrl()}/tasks/${taskId}/attachments/${attachmentId}`;
    const headers: Record<string, string> = {
      Accept: '*/*',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { method: 'GET', headers });
    } catch (error) {
      throw new CloudApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      const parsed = text ? this.safeParseJson(text) : undefined;
      throw CloudApiError.fromResponse(response.status, parsed ?? text);
    }

    const arrayBuffer = await response.arrayBuffer();
    const mimeType =
      response.headers.get('content-type')?.split(';')[0]?.trim() ??
      'application/octet-stream';
    const disposition = response.headers.get('content-disposition') ?? '';
    const fileNameMatch = disposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch?.[1] ?? attachmentId;

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
      fileName,
    };
  }

  /** Uploads an image or video attachment to a cloud task. */
  async uploadAttachment(
    taskId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<ApiTask> {
    const url = `${getApiBaseUrl()}/tasks/${taskId}/attachments`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append('file', blob, fileName);

    let response: Response;
    try {
      response = await fetch(url, { method: 'POST', headers, body: form });
    } catch (error) {
      throw new CloudApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
      );
    }

    const text = await response.text();
    const parsed = text ? this.safeParseJson(text) : undefined;

    if (!response.ok) {
      throw CloudApiError.fromResponse(response.status, parsed ?? text);
    }

    const body = parsed as { task?: ApiTask; data?: { task?: ApiTask } };
    const task = body.task ?? body.data?.task;
    if (!task) {
      throw new CloudApiError('Upload succeeded but task payload was missing', 0);
    }

    return task;
  }

  /** Deletes a task attachment and returns the updated task. */
  async deleteAttachment(
    taskId: string,
    attachmentId: string,
  ): Promise<ApiTask> {
    const url = `${getApiBaseUrl()}/tasks/${taskId}/attachments/${attachmentId}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { method: 'DELETE', headers });
    } catch (error) {
      throw new CloudApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
      );
    }

    const text = await response.text();
    const parsed = text ? this.safeParseJson(text) : undefined;

    if (!response.ok) {
      throw CloudApiError.fromResponse(response.status, parsed ?? text);
    }

    const body = parsed as { task?: ApiTask; data?: { task?: ApiTask } };
    const task = body.task ?? body.data?.task;
    if (!task) {
      throw new CloudApiError('Delete succeeded but task payload was missing', 0);
    }

    return task;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token && !path.includes('/auth/login') && !path.includes('/auth/register')) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new CloudApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
      );
    }

    const text = await response.text();
    const parsed = text ? this.safeParseJson(text) : undefined;

    if (!response.ok) {
      throw CloudApiError.fromResponse(response.status, parsed ?? text);
    }

    return this.unwrap<T>(parsed);
  }

  private safeParseJson(text: string): unknown {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private unwrap<T>(body: unknown): T {
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as { data: T }).data;
    }

    return body as T;
  }
}
