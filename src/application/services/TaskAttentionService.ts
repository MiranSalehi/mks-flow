import type { Task } from '../../domain/models/Task';

export interface TaskAttentionSummary {
  /** Tasks waiting for approval (Test column). */
  testCount: number;
  /** Tasks currently in progress (Doing column). */
  doingCount: number;
  /** Shown on the activity bar badge; 0 means hide badge. */
  badgeCount: number;
  badgeTooltip: string;
}

/** Computes counts used for sidebar badge and status bar launcher. */
export function summarizeTaskAttention(tasks: Task[]): TaskAttentionSummary {
  const testCount = tasks.filter((task) => task.status === 'test').length;
  const doingCount = tasks.filter((task) => task.status === 'doing').length;
  const badgeCount = testCount > 0 ? testCount : doingCount;

  let badgeTooltip = 'MKSFlow — open board';
  if (testCount > 0) {
    badgeTooltip = `${testCount} task(s) in Test — click to open board`;
  } else if (doingCount > 0) {
    badgeTooltip = `${doingCount} task(s) in progress — click to open board`;
  }

  return { testCount, doingCount, badgeCount, badgeTooltip };
}
