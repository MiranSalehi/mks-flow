import * as fs from 'fs';
import * as path from 'path';

/** Only attachments are gitignored — task context files must stay readable for @-mentions. */
export const MKSFLOW_ATTACHMENTS_GITIGNORE = '.mksflow/attachments/';

/** Legacy entry that also hid `.mksflow/tasks/` from Cursor Composer. */
export const MKSFLOW_LEGACY_GITIGNORE = '.mksflow/';

/**
 * Ensures `.mksflow/attachments/` is gitignored without ignoring task context files.
 * Migrates a legacy `.mksflow/` line if MKSFlow added it earlier.
 */
export function ensureMksflowGitignore(workspaceRoot: string): void {
  const gitignorePath = path.join(workspaceRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  let changed = false;
  let hasAttachmentsEntry = false;

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();

    if (trimmed === MKSFLOW_ATTACHMENTS_GITIGNORE) {
      hasAttachmentsEntry = true;
      return line;
    }

    if (trimmed === MKSFLOW_LEGACY_GITIGNORE) {
      changed = true;
      if (!hasAttachmentsEntry) {
        hasAttachmentsEntry = true;
        return MKSFLOW_ATTACHMENTS_GITIGNORE;
      }
      return '';
    }

    return line;
  }).filter((line, index, all) => {
    if (line !== '') {
      return true;
    }

    return index === 0 || all[index - 1] !== '';
  });

  if (!hasAttachmentsEntry) {
    nextLines.push(MKSFLOW_ATTACHMENTS_GITIGNORE);
    changed = true;
  }

  if (!changed) {
    return;
  }

  const body = nextLines.join('\n');
  fs.writeFileSync(
    gitignorePath,
    body.endsWith('\n') ? body : `${body}\n`,
    'utf8',
  );
}
