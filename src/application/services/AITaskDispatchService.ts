import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import type { AIResponse } from '../../domain/interfaces/IAIProvider';
import type { Container } from '../container';

/**
 * Sends a task to the configured AI provider (Composer or clipboard).
 */
export async function dispatchTaskToAi(
  container: Container,
  task: Task,
  project: Project,
): Promise<AIResponse> {
  const prompt = container.aiPromptService.generatePrompt(task, project);
  return container.aiProvider.sendPrompt(prompt, { task, project });
}
