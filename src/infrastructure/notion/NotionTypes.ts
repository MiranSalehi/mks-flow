import type { TaskPriority, TaskStatus } from '../../domain/types';

export interface NotionUser {
  id: string;
  name: string | null;
  type: string;
  avatar_url: string | null;
}

export interface NotionDatabaseSummary {
  id: string;
  title: string;
  icon: string | null;
  url: string;
}

export interface NotionPropertySchema {
  id: string;
  name: string;
  type: string;
  status?: { options: { name: string }[] };
  select?: { options: { name: string }[] };
}

export interface NotionDatabaseSchema {
  id: string;
  title: string;
  url: string;
  properties: Record<string, NotionPropertySchema>;
}

export interface NotionRichText {
  plain_text: string;
}

export interface NotionPage {
  id: string;
  url: string;
  archived: boolean;
  last_edited_time: string;
  properties: Record<string, NotionPageProperty>;
}

export interface NotionPageProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  status?: { name: string } | null;
  select?: { name: string } | null;
  multi_select?: { name: string }[];
  url?: string | null;
}

export interface NotionBlock {
  id: string;
  type: string;
  paragraph?: { rich_text: NotionRichText[] };
  heading_1?: { rich_text: NotionRichText[] };
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
  bulleted_list_item?: { rich_text: NotionRichText[] };
  numbered_list_item?: { rich_text: NotionRichText[] };
}

/** Per-local-project Notion database linkage and field mapping. */
export interface NotionProjectConfig {
  databaseId: string;
  databaseTitle: string;
  databaseUrl: string;
  titleProperty: string;
  statusProperty: string | null;
  statusPropertyType: 'status' | 'select' | null;
  priorityProperty: string | null;
  tagsProperty: string | null;
  descriptionProperty: string | null;
  statusMap: Record<string, TaskStatus>;
  statusReverseMap: Record<TaskStatus, string>;
  priorityMap: Record<string, TaskPriority>;
  priorityReverseMap: Record<TaskPriority, string>;
  lastSyncAt: string | null;
}

export interface PropertyMappingDraft {
  titleProperty: string;
  statusProperty: string | null;
  statusPropertyType: 'status' | 'select' | null;
  priorityProperty: string | null;
  tagsProperty: string | null;
  descriptionProperty: string | null;
  statusMap: Record<string, TaskStatus>;
  priorityMap: Record<string, TaskPriority>;
  statusOptions: string[];
  priorityOptions: string[];
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

export interface NotionDatabaseOption {
  id: string;
  title: string;
  icon: string | null;
  url: string;
}
