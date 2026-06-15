/** SecretStorage key for the GitHub personal access token. */
export const GITHUB_SECRETS_KEY = 'mksflow.github.token';

/** globalState key for per-project GitHub linkage config. */
export const GITHUB_PROJECT_CONFIG_KEY = 'mksflow.github.projectConfigs';

/** globalState key for cached GitHub user profile. */
export const GITHUB_USER_KEY = 'mksflow.github.user';

export const GITHUB_REST_URL = 'https://api.github.com';
export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export const GITHUB_PROVIDER_ID = 'github';

export const GITHUB_LABEL_DOING = 'mksflow:doing';
export const GITHUB_LABEL_TEST = 'mksflow:test';

export type GitHubSyncStatus = 'idle' | 'syncing' | 'error';

export type GitHubSyncMode = 'issues' | 'prs' | 'board';
