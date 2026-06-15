import type { LinearApiClient } from '../infrastructure/linear/LinearApiClient';
import type { LinearAuthService } from './services/LinearAuthService';
import type { LinearConfigService } from './services/LinearConfigService';
import type { LinearSyncService } from './services/LinearSyncService';

export interface LinearContext {
  api: LinearApiClient;
  auth: LinearAuthService;
  config: LinearConfigService;
  sync: LinearSyncService;
}

let linearContext: LinearContext | undefined;

export function setLinearContext(context: LinearContext): void {
  linearContext = context;
}

export function getLinearContext(): LinearContext | undefined {
  return linearContext;
}

export function clearLinearContext(): void {
  linearContext?.sync.dispose();
  linearContext = undefined;
}
