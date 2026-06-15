import {
  NOTION_API_URL,
  NOTION_API_VERSION,
} from '../../shared/notionConfig';
import { NotionApiError } from './NotionApiError';
import {
  blocksToPlainText,
  extractDatabaseTitle,
  flattenRichText,
} from './notionMappers';
import type {
  NotionBlock,
  NotionDatabaseSchema,
  NotionDatabaseSummary,
  NotionPage,
  NotionPropertySchema,
  NotionUser,
} from './NotionTypes';

const MIN_REQUEST_INTERVAL_MS = 340;

/**
 * Notion REST client with basic rate limiting (~3 req/s).
 */
export class NotionApiClient {
  private token: string | null = null;
  private lastRequestAt = 0;

  setToken(token: string | null): void {
    this.token = token?.trim() || null;
  }

  getToken(): string | null {
    return this.token;
  }

  async getMe(): Promise<NotionUser> {
    return this.request<NotionUser>('/users/me');
  }

  async searchDatabases(query = ''): Promise<NotionDatabaseSummary[]> {
    const databases: NotionDatabaseSummary[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.request<{
        results: {
          id: string;
          url: string;
          icon?: { type: string; emoji?: string };
          title?: { plain_text: string }[];
        }[];
        has_more: boolean;
        next_cursor: string | null;
      }>('/search', {
        method: 'POST',
        body: {
          query: query || undefined,
          filter: { property: 'object', value: 'database' },
          page_size: 100,
          start_cursor: cursor,
        },
      });

      for (const item of page.results) {
        databases.push({
          id: item.id,
          title: extractDatabaseTitle(undefined, item.title),
          icon: item.icon?.emoji ?? null,
          url: item.url,
        });
      }

      cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
    } while (cursor);

    return databases;
  }

  async getDatabase(databaseId: string): Promise<NotionDatabaseSchema> {
    const database = await this.request<{
      id: string;
      url: string;
      title: { plain_text: string }[];
      properties: Record<string, NotionPropertySchema>;
    }>(`/databases/${databaseId}`);

    return {
      id: database.id,
      url: database.url,
      title: flattenRichText(database.title),
      properties: database.properties,
    };
  }

  async queryDatabase(databaseId: string): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.request<{
        results: NotionPage[];
        has_more: boolean;
        next_cursor: string | null;
      }>(`/databases/${databaseId}/query`, {
        method: 'POST',
        body: {
          page_size: 100,
          start_cursor: cursor,
        },
      });

      pages.push(...page.results.filter((item) => !item.archived));
      cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
    } while (cursor);

    return pages;
  }

  async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.request<{
        results: NotionBlock[];
        has_more: boolean;
        next_cursor: string | null;
      }>(`/blocks/${pageId}/children`, {
        query: cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 },
      });

      blocks.push(...page.results);
      cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
    } while (cursor);

    return blocks;
  }

  async createPage(
    databaseId: string,
    properties: Record<string, unknown>,
    description?: string,
  ): Promise<NotionPage> {
    const created = await this.request<NotionPage>('/pages', {
      method: 'POST',
      body: {
        parent: { database_id: databaseId },
        properties,
      },
    });

    if (description?.trim()) {
      await this.appendParagraph(created.id, description);
    }

    return created;
  }

  async updatePage(
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`/pages/${pageId}`, {
      method: 'PATCH',
      body: { properties },
    });
  }

  async archivePage(pageId: string): Promise<void> {
    await this.request(`/pages/${pageId}`, {
      method: 'PATCH',
      body: { archived: true },
    });
  }

  async appendParagraph(pageId: string, text: string): Promise<void> {
    await this.request(`/blocks/${pageId}/children`, {
      method: 'PATCH',
      body: {
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: text } }],
            },
          },
        ],
      },
    });
  }

  private async request<T>(
    path: string,
    init?: {
      method?: string;
      body?: unknown;
      query?: Record<string, string | number>;
    },
  ): Promise<T> {
    if (!this.token) {
      throw new NotionApiError('Notion token is not configured');
    }

    await this.throttle();

    const url = new URL(`${NOTION_API_URL}${path}`);
    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429) {
        await this.delay(1000);
        return this.request<T>(path, init);
      }
      throw new NotionApiError(
        text || `Notion API failed (${response.status})`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await this.delay(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { blocksToPlainText };
