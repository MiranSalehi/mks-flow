/** Error thrown when the Linear GraphQL API returns an error response. */
export class LinearApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'LinearApiError';
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}
