import { arrayMove } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types/messages';
import { STATUSES } from '../../types/messages';

export type ColumnItemIds = Record<TaskStatus, string[]>;

export function isTaskStatus(value: string): value is TaskStatus {
  return STATUSES.includes(value as TaskStatus);
}

export function sortColumnTasks(tasks: Task[], status: TaskStatus): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function buildColumnItemIds(tasks: Task[]): ColumnItemIds {
  return Object.fromEntries(
    STATUSES.map((status) => [
      status,
      sortColumnTasks(tasks, status).map((task) => task.id),
    ]),
  ) as ColumnItemIds;
}

export function findColumnForTask(
  items: ColumnItemIds,
  taskId: string,
): TaskStatus | null {
  for (const status of STATUSES) {
    if (items[status].includes(taskId)) {
      return status;
    }
  }

  return null;
}

export function resolveColumnTasks(
  tasks: Task[],
  items: ColumnItemIds,
  status: TaskStatus,
): Task[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return items[status]
    .map((id) => byId.get(id))
    .filter((task): task is Task => !!task);
}

export function moveItemOnDragOver(
  items: ColumnItemIds,
  activeId: string,
  overId: string,
): ColumnItemIds | null {
  const activeStatus = findColumnForTask(items, activeId);
  if (!activeStatus) {
    return null;
  }

  const overStatus = isTaskStatus(overId)
    ? overId
    : findColumnForTask(items, overId);
  if (!overStatus || overStatus === 'done') {
    return null;
  }

  if (activeStatus === overStatus) {
    const column = items[activeStatus];
    const oldIndex = column.indexOf(activeId);
    let newIndex = oldIndex;

    if (isTaskStatus(overId)) {
      newIndex = column.length - 1;
    } else {
      newIndex = column.indexOf(overId);
    }

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return null;
    }

    return {
      ...items,
      [activeStatus]: arrayMove(column, oldIndex, newIndex),
    };
  }

  const source = [...items[activeStatus]];
  const target = [...items[overStatus]];
  const oldIndex = source.indexOf(activeId);
  if (oldIndex < 0) {
    return null;
  }

  let newIndex = target.length;
  if (!isTaskStatus(overId)) {
    const overIndex = target.indexOf(overId);
    if (overIndex >= 0) {
      newIndex = overIndex;
    }
  }

  source.splice(oldIndex, 1);
  target.splice(newIndex, 0, activeId);

  return {
    ...items,
    [activeStatus]: source,
    [overStatus]: target,
  };
}
