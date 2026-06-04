import type { Project } from '../models/Project';
import type { Task } from '../models/Task';
import type { GitFiles } from '../types';

/** Context assembled when sending a task prompt to an AI provider. */
export interface TaskContext {
  task: Task;
  project: Project;
  workspaceFiles?: string[];
  gitFiles?: GitFiles;
}

/** Result of an AI provider prompt submission. */
export interface AIResponse {
  success: boolean;
  message?: string;
  error?: string;
  contextFilePath?: string;
  relativePath?: string;
  chatPrompt?: string;
}

/** Pluggable AI backend (clipboard, Cursor, Claude, MCP, …). */
export interface IAIProvider {
  id: string;
  name: string;
  /** Returns whether this provider can be used in the current environment. */
  isAvailable(): Promise<boolean>;
  /** Sends a generated prompt with full task context. */
  sendPrompt(prompt: string, context: TaskContext): Promise<AIResponse>;
}
