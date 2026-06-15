/** SecretStorage key for the Linear personal API key. */
export const LINEAR_SECRETS_KEY = 'mksflow.linear.apiKey';

/** globalState key for per-project Linear linkage config. */
export const LINEAR_PROJECT_CONFIG_KEY = 'mksflow.linear.projectConfigs';

/** globalState key for cached Linear workspace viewer name. */
export const LINEAR_VIEWER_KEY = 'mksflow.linear.viewer';

export const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

export const LINEAR_PROVIDER_ID = 'linear';

export type LinearSyncStatus = 'idle' | 'syncing' | 'error';

export interface LinearSyncStatusState {
  status: LinearSyncStatus;
  message?: string;
  lastSyncAt: string | null;
}
