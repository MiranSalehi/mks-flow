/**
 * Thrown when a task lifecycle transition is not allowed.
 */
export class TaskTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskTransitionError';
  }
}
