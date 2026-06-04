/** Image attached to a task description (stored under `.mksflow/attachments/`). */
export interface TaskDescriptionImage {
  id: string;
  fileName: string;
  mimeType: string;
  /** Workspace-relative path using forward slashes. */
  relativePath: string;
}
