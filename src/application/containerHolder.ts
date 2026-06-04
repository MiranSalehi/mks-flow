import type { Container } from './container';

let container: Container | undefined;

/** Stores the active DI container after extension activation. */
export function setContainer(value: Container): void {
  container = value;
}

/** Returns the active DI container. */
export function getContainer(): Container {
  if (!container) {
    throw new Error('MKSFlow container is not initialized');
  }

  return container;
}

/** Clears the container on deactivation. */
export function clearContainer(): void {
  container = undefined;
}
