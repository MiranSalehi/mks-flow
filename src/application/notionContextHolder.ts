import type { NotionApiClient } from '../infrastructure/notion/NotionApiClient';
import type { NotionAuthService } from './services/NotionAuthService';
import type { NotionConfigService } from './services/NotionConfigService';
import type { NotionSyncService } from './services/NotionSyncService';

export interface NotionContext {
  api: NotionApiClient;
  auth: NotionAuthService;
  config: NotionConfigService;
  sync: NotionSyncService;
}

let notionContext: NotionContext | undefined;

export function setNotionContext(context: NotionContext): void {
  notionContext = context;
}

export function getNotionContext(): NotionContext | undefined {
  return notionContext;
}

export function clearNotionContext(): void {
  notionContext?.sync.dispose();
  notionContext = undefined;
}
