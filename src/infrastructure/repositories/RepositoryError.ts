/**
 * Thrown when a repository operation fails or the target entity is missing.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' = 'DATABASE',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/** Wraps SQLite errors with a consistent repository error type. */
export function wrapRepositoryError(
  message: string,
  error: unknown,
): RepositoryError {
  if (error instanceof RepositoryError) {
    return error;
  }

  return new RepositoryError(message, 'DATABASE', error);
}
