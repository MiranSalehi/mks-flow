/** SecretStorage key for the Notion integration token. */
export const NOTION_SECRETS_KEY = 'mksflow.notion.token';

/** globalState key for cached Notion workspace/bot info. */
export const NOTION_WORKSPACE_KEY = 'mksflow.notion.workspace';

/** globalState key for per-project Notion linkage + property mapping. */
export const NOTION_PROJECT_CONFIG_KEY = 'mksflow.notion.projectConfigs';

export const NOTION_API_URL = 'https://api.notion.com/v1';
export const NOTION_API_VERSION = '2022-06-28';

export const NOTION_PROVIDER_ID = 'notion';

export type NotionSyncStatus = 'idle' | 'syncing' | 'error';
