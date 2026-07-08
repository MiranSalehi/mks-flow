import * as vscode from 'vscode';
import type { CloudApiClient } from '../../infrastructure/cloud/CloudApiClient';
import type { ApiUser } from '../../infrastructure/cloud/CloudApiTypes';
import { CloudApiError } from '../../infrastructure/cloud/CloudApiError';
import { CLOUD_SECRETS_KEY } from '../../shared/cloudConfig';

/**
 * Manages cloud authentication tokens in VS Code SecretStorage.
 */
export class CloudAuthService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: CloudApiClient,
  ) {}

  /** Whether a stored token exists. */
  async hasToken(): Promise<boolean> {
    const token = await this.context.secrets.get(CLOUD_SECRETS_KEY);
    return Boolean(token);
  }

  /** Loads the stored token into the API client, if present. */
  async loadStoredToken(): Promise<boolean> {
    const token = await this.context.secrets.get(CLOUD_SECRETS_KEY);
    if (!token) {
      this.api.setToken(null);
      return false;
    }

    this.api.setToken(token);
    return true;
  }

  /** Logs in with email/password and persists the token. */
  async login(email: string, password: string): Promise<ApiUser> {
    const response = await this.api.login(email.trim(), password);
    await this.persistToken(response.token);
    return response.user;
  }

  /** Validates and stores a Sanctum API token from the cloud profile. */
  async connectWithToken(token: string): Promise<ApiUser> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error('API token is required');
    }

    this.api.setToken(trimmed);
    try {
      const user = await this.api.me();
      await this.persistToken(trimmed);
      return user;
    } catch (error) {
      this.api.setToken(null);
      if (error instanceof CloudApiError && error.isUnauthorized()) {
        throw new Error('Invalid or expired API token');
      }
      throw error;
    }
  }

  private async persistToken(token: string): Promise<void> {
    await this.context.secrets.store(CLOUD_SECRETS_KEY, token);
    this.api.setToken(token);
  }

  /** Clears the token locally and revokes it on the server when possible. */
  async logout(): Promise<void> {
    try {
      if (this.api.getToken()) {
        await this.api.logout();
      }
    } catch {
      // Best-effort revoke
    }

    await this.context.secrets.delete(CLOUD_SECRETS_KEY);
    this.api.setToken(null);
  }

  /** Returns the current user profile or null if unauthenticated. */
  async getCurrentUser(): Promise<ApiUser | null> {
    const hasToken = await this.loadStoredToken();
    if (!hasToken) {
      return null;
    }

    try {
      return await this.api.me();
    } catch (error) {
      if (error instanceof CloudApiError && error.isUnauthorized()) {
        await this.clearToken();
      }
      return null;
    }
  }

  /** Removes the stored token without calling the API. */
  async clearToken(): Promise<void> {
    await this.context.secrets.delete(CLOUD_SECRETS_KEY);
    this.api.setToken(null);
  }
}
