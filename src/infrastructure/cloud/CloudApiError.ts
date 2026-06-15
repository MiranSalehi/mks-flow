/** HTTP error from the MKSFlow Cloud API. */
export class CloudApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'CloudApiError';
  }

  /** Whether the request failed due to missing or invalid authentication. */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Extracts a user-facing message from Laravel validation responses. */
  static fromResponse(status: number, body: unknown): CloudApiError {
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record.message === 'string') {
        return new CloudApiError(record.message, status, body);
      }
      if (record.errors && typeof record.errors === 'object') {
        const errors = record.errors as Record<string, string[]>;
        const preferred = errors.file?.[0] ?? errors.pendingUpload?.[0];
        if (preferred) {
          return new CloudApiError(preferred, status, body);
        }
        const first = Object.values(errors).flat()[0];
        if (first) {
          return new CloudApiError(first, status, body);
        }
      }
    }

    return new CloudApiError(`Cloud API request failed (${status})`, status, body);
  }
}
