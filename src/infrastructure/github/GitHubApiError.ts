/** Error thrown when the GitHub API returns an error response. */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}
