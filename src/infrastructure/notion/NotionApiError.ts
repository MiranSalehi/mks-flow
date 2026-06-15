/** Error thrown when the Notion API returns an error response. */
export class NotionApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'NotionApiError';
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}
