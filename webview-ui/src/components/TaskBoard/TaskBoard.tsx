import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import { useEffect, useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../../types/messages';
import { STATUSES, STATUS_LABELS } from '../../types/messages';
import {
  buildColumnItemIds,
  findColumnForTask,
  moveItemOnDragOver,
  resolveColumnTasks,
  type ColumnItemIds,
} from './boardDrag';
import { TaskCardPreview } from './TaskCardPreview';
import { TaskColumn } from './TaskColumn';

interface TaskBoardProps {
  tasks: Task[];
  elapsedByTaskId: Record<string, number>;
  readOnly?: boolean;
  onMoveTask: (taskId: string, toStatus: TaskStatus, insertAt?: number) => void;
  onReorderTasks: (status: TaskStatus, taskIds: string[]) => void;
  onAddTask: (status: TaskStatus) => void;
  onOpenTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onReadyForTest: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  onRevertToTodo: (taskId: string) => void;
  onRevertToDoing: (taskId: string) => void;
  onSendToAi: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const dropAnimation: DropAnimation = {
  duration: 240,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function TaskBoard({
  tasks,
  elapsedByTaskId,
  readOnly = false,
  onMoveTask,
  onReorderTasks,
  onAddTask,
  onOpenTask,
  onStartTask,
  onReadyForTest,
  onApproveTask,
  onRevertToTodo,
  onRevertToDoing,
  onSendToAi,
  onDeleteTask,
}: TaskBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | undefined>();
  const [columnItems, setColumnItems] = useState<ColumnItemIds>(() =>
    buildColumnItemIds(tasks),
  );

  useEffect(() => {
    if (!activeTask) {
      setColumnItems(buildColumnItemIds(tasks));
    }
  }, [tasks, activeTask]);

  const tasksByStatus = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          resolveColumnTasks(tasks, columnItems, status),
        ]),
      ) as Record<TaskStatus, Task[]>,
    [tasks, columnItems],
  );

  const resetDragState = () => {
    setActiveTask(null);
    setActiveColumn(null);
    setOverlayWidth(undefined);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item.id === String(event.active.id));
    if (!task || task.status === 'done') {
      return;
    }

    const width = event.active.rect.current.initial?.width;
    setOverlayWidth(width ? Math.round(width) : undefined);
    setActiveTask(task);
    setActiveColumn(findColumnForTask(columnItems, task.id));
    setColumnItems(buildColumnItemIds(tasks));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const nextItems = moveItemOnDragOver(columnItems, activeId, overId);
    if (!nextItems) {
      return;
    }

    setColumnItems(nextItems);
    setActiveColumn(findColumnForTask(nextItems, activeId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);
    const activeTaskItem = tasks.find((item) => item.id === activeId);
    const sourceItems = buildColumnItemIds(tasks);
    const finalItems = columnItems;

    resetDragState();

    if (!over || !activeTaskItem || activeTaskItem.status === 'done') {
      return;
    }

    const sourceStatus = findColumnForTask(sourceItems, activeId);
    const targetStatus = findColumnForTask(finalItems, activeId);
    if (!sourceStatus || !targetStatus || targetStatus === 'done') {
      return;
    }

    const sourceOrder = sourceItems[sourceStatus];
    const targetOrder = finalItems[targetStatus];
    const sourceIndex = sourceOrder.indexOf(activeId);
    const targetIndex = targetOrder.indexOf(activeId);

    if (sourceStatus === targetStatus) {
      if (sourceIndex === targetIndex || targetIndex < 0) {
        return;
      }
      onReorderTasks(targetStatus, targetOrder);
      return;
    }

    onMoveTask(activeId, targetStatus, targetIndex);
  };

  const handleDragCancel = () => {
    resetDragState();
    setColumnItems(buildColumnItemIds(tasks));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`task-board ${activeTask ? 'task-board--dragging' : ''}`}>
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            title={STATUS_LABELS[status]}
            tasks={tasksByStatus[status]}
            elapsedByTaskId={elapsedByTaskId}
            readOnly={readOnly}
            onAddTask={() => onAddTask(status)}
            onOpenTask={onOpenTask}
            onStartTask={onStartTask}
            onReadyForTest={onReadyForTest}
            onApproveTask={onApproveTask}
            onRevertToTodo={onRevertToTodo}
            onRevertToDoing={onRevertToDoing}
            onSendToAi={onSendToAi}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={dropAnimation} className="task-board__overlay">
        {activeTask ? (
          <div
            className="task-board__overlay-inner"
            style={overlayWidth ? { width: overlayWidth } : undefined}
          >
            <TaskCardPreview
              task={activeTask}
              columnStatus={activeColumn ?? activeTask.status}
              className="task-card--floating"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
