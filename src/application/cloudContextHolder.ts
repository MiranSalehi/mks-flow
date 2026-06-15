import type { CloudApiClient } from '../infrastructure/cloud/CloudApiClient';
import type { CloudAuthService } from './services/CloudAuthService';
import type { CloudSyncService } from './services/CloudSyncService';
import type { CloudTaskService } from './services/CloudTaskService';

export interface CloudContext {
  api: CloudApiClient;
  auth: CloudAuthService;
  sync: CloudSyncService;
  tasks: CloudTaskService;
}

let cloudContext: CloudContext | undefined;

/** Stores the cloud service bundle for the active extension session. */
export function setCloudContext(context: CloudContext): void {
  cloudContext = context;
}

/** Returns the cloud service bundle. */
export function getCloudContext(): CloudContext {
  if (!cloudContext) {
    throw new Error('MKSFlow cloud services are not initialized');
  }

  return cloudContext;
}

/** Returns cloud context when initialized, otherwise undefined. */
export function tryGetCloudContext(): CloudContext | undefined {
  return cloudContext;
}

/** Clears cloud context on deactivate. */
export function clearCloudContext(): void {
  cloudContext?.sync.dispose();
  cloudContext = undefined;
}
