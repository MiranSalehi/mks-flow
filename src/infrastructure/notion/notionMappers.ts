import type { CreateTaskDto } from '../../domain/models/Task';
import type { ExternalTask } from '../../domain/interfaces/ISyncProvider';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import { NOTION_PROVIDER_ID } from '../../shared/notionConfig';
import type {
  NotionBlock,
  NotionDatabaseSchema,
  NotionPage,
  NotionPageProperty,
  NotionProjectConfig,
  NotionPropertySchema,
  NotionRichText,
  PropertyMappingDraft,
} from './NotionTypes';

const DEFAULT_STATUS_NAMES: Record<string, TaskStatus> = {
  'Not started': 'todo',
  'Not Started': 'todo',
  Todo: 'todo',
  Backlog: 'todo',
  'In progress': 'doing',
  'In Progress': 'doing',
  Doing: 'doing',
  Started: 'doing',
  'In review': 'test',
  'In Review': 'test',
  Review: 'test',
  Test: 'test',
  QA: 'test',
  Done: 'done',
  Complete: 'done',
  Completed: 'done',
};

const DEFAULT_PRIORITY_NAMES: Record<string, TaskPriority> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Urgent: 'critical',
  Critical: 'critical',
};

export function flattenRichText(parts: NotionRichText[] | undefined): string {
  if (!parts?.length) {
    return '';
  }
  return parts.map((part) => part.plain_text).join('');
}

export function blocksToPlainText(blocks: NotionBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const rich =
      block.paragraph?.rich_text ??
      block.heading_1?.rich_text ??
      block.heading_2?.rich_text ??
      block.heading_3?.rich_text ??
      block.bulleted_list_item?.rich_text ??
      block.numbered_list_item?.rich_text;
    const text = flattenRichText(rich);
    if (text) {
      lines.push(text);
    }
  }
  return lines.join('\n').trim();
}

export function plainTextToRichText(text: string): NotionRichText[] {
  if (!text.trim()) {
    return [];
  }
  return [{ plain_text: text }];
}

function getProperty(
  page: NotionPage,
  name: string | null,
): NotionPageProperty | undefined {
  if (!name) {
    return undefined;
  }
  return page.properties[name];
}

export function extractTitle(page: NotionPage, propertyName: string): string {
  const prop = getProperty(page, propertyName);
  if (prop?.type === 'title' && prop.title) {
    return flattenRichText(prop.title);
  }
  return 'Untitled';
}

export function extractRichTextProperty(
  page: NotionPage,
  propertyName: string | null,
): string {
  const prop = getProperty(page, propertyName);
  if (prop?.type === 'rich_text' && prop.rich_text) {
    return flattenRichText(prop.rich_text);
  }
  return '';
}

export function extractStatusName(
  page: NotionPage,
  propertyName: string | null,
): string | null {
  const prop = getProperty(page, propertyName);
  if (prop?.type === 'status') {
    return prop.status?.name ?? null;
  }
  if (prop?.type === 'select') {
    return prop.select?.name ?? null;
  }
  return null;
}

export function extractPriorityName(
  page: NotionPage,
  propertyName: string | null,
): string | null {
  const prop = getProperty(page, propertyName);
  if (prop?.type === 'select') {
    return prop.select?.name ?? null;
  }
  return null;
}

export function extractTags(
  page: NotionPage,
  propertyName: string | null,
): string[] {
  const prop = getProperty(page, propertyName);
  if (prop?.type === 'multi_select' && prop.multi_select) {
    return prop.multi_select.map((item: { name: string }) => item.name);
  }
  return [];
}

export function mapPageToExternal(
  page: NotionPage,
  config: NotionProjectConfig,
  blockDescription: string,
): ExternalTask {
  const statusName = extractStatusName(page, config.statusProperty);
  const priorityName = extractPriorityName(page, config.priorityProperty);
  const propertyDescription = extractRichTextProperty(
    page,
    config.descriptionProperty,
  );
  const description = propertyDescription || blockDescription;

  return {
    externalId: page.id,
    title: extractTitle(page, config.titleProperty),
    description,
    status: statusName
      ? (config.statusMap[statusName] ?? 'todo')
      : 'todo',
    priority: priorityName
      ? (config.priorityMap[priorityName] ?? 'medium')
      : 'medium',
    url: page.url,
  };
}

export function mapExternalToCreateDto(
  external: ExternalTask,
  projectId: string,
  tags: string[] = [],
): CreateTaskDto {
  return {
    projectId,
    title: external.title,
    description: external.description,
    status: external.status as TaskStatus,
    priority: external.priority as TaskPriority,
    tags,
    externalId: external.externalId,
    externalProvider: NOTION_PROVIDER_ID,
    externalUrl: external.url,
  };
}

export function autoDetectMapping(
  schema: NotionDatabaseSchema,
): PropertyMappingDraft {
  const entries = Object.entries(schema.properties);
  const titleEntry =
    entries.find(([, prop]) => prop.type === 'title') ?? entries[0];

  const statusEntry =
    entries.find(
      ([name, prop]) =>
        prop.type === 'status' || name.toLowerCase() === 'status',
    ) ??
    entries.find(
      ([, prop]) => prop.type === 'select',
    );

  const priorityEntry = entries.find(
    ([name, prop]) =>
      prop.type === 'select' && name.toLowerCase().includes('priority'),
  );

  const tagsEntry = entries.find(([, prop]) => prop.type === 'multi_select');

  const descriptionEntry = entries.find(
    ([name, prop]) =>
      prop.type === 'rich_text' && name.toLowerCase().includes('description'),
  );

  const statusOptions = getSelectOptions(statusEntry?.[1]);
  const priorityOptions = getSelectOptions(priorityEntry?.[1]);

  const statusMap = buildStatusMap(statusOptions);
  const priorityMap = buildPriorityMap(priorityOptions);

  const statusSchema = statusEntry?.[1];
  const statusPropertyType =
    statusSchema?.type === 'status'
      ? 'status'
      : statusSchema?.type === 'select'
        ? 'select'
        : null;

  return {
    titleProperty: titleEntry?.[0] ?? 'Name',
    statusProperty: statusEntry?.[0] ?? null,
    statusPropertyType,
    priorityProperty: priorityEntry?.[0] ?? null,
    tagsProperty: tagsEntry?.[0] ?? null,
    descriptionProperty: descriptionEntry?.[0] ?? null,
    statusMap,
    priorityMap,
    statusOptions,
    priorityOptions,
  };
}

export function buildProjectConfig(
  schema: NotionDatabaseSchema,
  mapping: PropertyMappingDraft,
): NotionProjectConfig {
  return {
    databaseId: schema.id,
    databaseTitle: schema.title,
    databaseUrl: schema.url,
    titleProperty: mapping.titleProperty,
    statusProperty: mapping.statusProperty,
    statusPropertyType: mapping.statusPropertyType,
    priorityProperty: mapping.priorityProperty,
    tagsProperty: mapping.tagsProperty,
    descriptionProperty: mapping.descriptionProperty,
    statusMap: mapping.statusMap,
    statusReverseMap: reverseStatusMap(mapping.statusMap),
    priorityMap: mapping.priorityMap,
    priorityReverseMap: reversePriorityMap(mapping.priorityMap),
    lastSyncAt: null,
  };
}

export function buildNotionProperties(
  task: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    tags: string[];
  },
  config: NotionProjectConfig,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [config.titleProperty]: {
      title: plainTextToRichText(task.title),
    },
  };

  if (
    config.statusProperty &&
    config.statusReverseMap[task.status] &&
    config.statusPropertyType
  ) {
    const value = config.statusReverseMap[task.status];
    if (config.statusPropertyType === 'status') {
      properties[config.statusProperty] = { status: { name: value } };
    } else {
      properties[config.statusProperty] = { select: { name: value } };
    }
  }

  if (config.priorityProperty && config.priorityReverseMap[task.priority]) {
    properties[config.priorityProperty] = {
      select: { name: config.priorityReverseMap[task.priority] },
    };
  }

  if (config.tagsProperty && task.tags.length > 0) {
    properties[config.tagsProperty] = {
      multi_select: task.tags.map((name) => ({ name })),
    };
  }

  if (config.descriptionProperty && task.description.trim()) {
    properties[config.descriptionProperty] = {
      rich_text: plainTextToRichText(task.description),
    };
  }

  return properties;
}

function getSelectOptions(schema: NotionPropertySchema | undefined): string[] {
  if (!schema) {
    return [];
  }
  if (schema.type === 'status' && schema.status?.options) {
    return schema.status.options.map((option) => option.name);
  }
  if (schema.type === 'select' && schema.select?.options) {
    return schema.select.options.map((option) => option.name);
  }
  return [];
}

function buildStatusMap(options: string[]): Record<string, TaskStatus> {
  const map: Record<string, TaskStatus> = {};
  for (const option of options) {
    map[option] = DEFAULT_STATUS_NAMES[option] ?? 'todo';
  }
  return map;
}

function buildPriorityMap(options: string[]): Record<string, TaskPriority> {
  const map: Record<string, TaskPriority> = {};
  for (const option of options) {
    map[option] = DEFAULT_PRIORITY_NAMES[option] ?? 'medium';
  }
  return map;
}

function reverseStatusMap(
  map: Record<string, TaskStatus>,
): Record<TaskStatus, string> {
  const reverse = {} as Record<TaskStatus, string>;
  for (const [name, status] of Object.entries(map)) {
    if (!reverse[status]) {
      reverse[status] = name;
    }
  }
  return reverse;
}

function reversePriorityMap(
  map: Record<string, TaskPriority>,
): Record<TaskPriority, string> {
  const reverse = {} as Record<TaskPriority, string>;
  for (const [name, priority] of Object.entries(map)) {
    if (!reverse[priority]) {
      reverse[priority] = name;
    }
  }
  return reverse;
}

export function extractDatabaseTitle(
  _properties: Record<string, unknown> | undefined,
  titleArray: { plain_text: string }[] | undefined,
): string {
  if (titleArray?.length) {
    return flattenRichText(titleArray);
  }
  return 'Untitled database';
}
