import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import * as vscode from 'vscode';

/**
 * Builds AI prompts from task context and copies them to the clipboard.
 * Decoupled from any specific AI provider implementation.
 */
export class AIPromptService {
  /**
   * Generates a structured prompt for the given task and project.
   */
  generatePrompt(task: Task, project: Project): string {
    const criteria =
      task.acceptanceCriteria.length > 0
        ? task.acceptanceCriteria.map((item) => `- ${item}`).join('\n')
        : '- None specified';

    const relatedFiles =
      task.relatedFiles.length > 0
        ? task.relatedFiles.map((file) => `- ${file}`).join('\n')
        : '- None specified';

    const descriptionImages =
      task.descriptionImages.length > 0
        ? task.descriptionImages
            .map(
              (image) =>
                `- ${image.fileName} (attachment:${image.id}) — cloud media, view in MKSFlow board`,
            )
            .join('\n')
        : '- None attached';

    return `## Current Task: ${task.title}

**Project:** ${project.name}
**Priority:** ${task.priority}
**Status:** ${task.status}

---

## Description
${task.description || 'No description provided.'}

---

## Description Images
${descriptionImages}

---

## Acceptance Criteria
${criteria}

---

## Related Files
${relatedFiles}

---

## Instructions
Please help me implement this task.
Analyze the related files and suggest a clear implementation plan.
Focus strictly on the acceptance criteria listed above.`;
  }

  /**
   * Copies text to the system clipboard via the VS Code API.
   */
  async copyToClipboard(text: string): Promise<void> {
    await vscode.env.clipboard.writeText(text);
  }
}
