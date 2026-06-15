import type { CreateTaskDto, Task } from '../../domain/models/Task';
import type {
  ExternalTask,
  ISyncProvider,
} from '../../domain/interfaces/ISyncProvider';
import { NOTION_PROVIDER_ID } from '../../shared/notionConfig';
import type { NotionApiClient } from '../notion/NotionApiClient';
import { blocksToPlainText } from '../notion/NotionApiClient';
import type { NotionProjectConfig } from '../notion/NotionTypes';
import {
  buildNotionProperties,
  extractTags,
  mapExternalToCreateDto,
  mapPageToExternal,
} from '../notion/notionMappers';

/**
 * {@link ISyncProvider} for Notion database pages.
 */
export class NotionSyncProvider implements ISyncProvider {
  readonly id = NOTION_PROVIDER_ID;
  readonly name = 'Notion';

  constructor(
    private readonly api: NotionApiClient,
    private readonly getConfig: (projectId: string) => NotionProjectConfig | null,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.api.getToken());
  }

  async pullTasks(projectId: string): Promise<ExternalTask[]> {
    const config = this.requireConfig(projectId);
    const pages = await this.api.queryDatabase(config.databaseId);
    const externals: ExternalTask[] = [];

    for (const page of pages) {
      let blockDescription = '';
      if (!config.descriptionProperty) {
        const blocks = await this.api.getPageBlocks(page.id);
        blockDescription = blocksToPlainText(blocks);
      }

      const tags = extractTags(page, config.tagsProperty);
      const external = mapPageToExternal(page, config, blockDescription);
      externals.push({
        ...external,
        tags,
        updatedAt: page.last_edited_time,
      });
    }

    return externals;
  }

  async pushTask(task: Task): Promise<string> {
    const config = this.requireConfig(task.projectId);
    const properties = buildNotionProperties(
      {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
      },
      config,
    );

    const useBlocks =
      !config.descriptionProperty && Boolean(task.description.trim());
    const created = await this.api.createPage(
      config.databaseId,
      properties,
      useBlocks ? task.description : undefined,
    );
    return created.id;
  }

  async updateTask(task: Task): Promise<void> {
    if (!task.externalId) {
      throw new Error('Cannot update Notion page without externalId');
    }

    const config = this.requireConfig(task.projectId);
    const properties = buildNotionProperties(
      {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
      },
      config,
    );

    await this.api.updatePage(task.externalId, properties);
  }

  async deleteTask(_externalId: string): Promise<void> {
    // Remote archive is handled by NotionSyncService.deleteRemoteTask.
  }

  mapToTask(external: ExternalTask): CreateTaskDto {
    return mapExternalToCreateDto(external, '');
  }

  mapToTaskForProject(
    external: ExternalTask,
    projectId: string,
    tags: string[] = [],
  ): CreateTaskDto {
    return mapExternalToCreateDto(external, projectId, tags);
  }

  private requireConfig(projectId: string): NotionProjectConfig {
    const config = this.getConfig(projectId);
    if (!config) {
      throw new Error(`Project ${projectId} is not linked to Notion`);
    }
    return config;
  }
}
