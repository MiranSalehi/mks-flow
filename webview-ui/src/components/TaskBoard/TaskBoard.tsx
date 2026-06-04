import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { Task, TaskStatus } from '../../types/messages';
import { STATUSES, STATUS_LABELS } from '../../types/messages';
import { TaskColumn } from './TaskColumn';

interface TaskBoardProps {
  tasks: Task[];
  elapsedByTaskId: Record<string, number>;
  onMoveTask: (taskId: string, toStatus: TaskStatus) => void;
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

export function TaskBoard({
  tasks,
  elapsedByTaskId,
  onMoveTask,
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const toStatus = String(over.id) as TaskStatus;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === toStatus || task.status === 'done') {
      return;
    }

    onMoveTask(taskId, toStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const task = tasks.find((item) => item.id === String(event.active.id));
        setActiveTask(task ?? null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="task-board">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            title={STATUS_LABELS[status]}
            tasks={tasks.filter((task) => task.status === status)}
            elapsedByTaskId={elapsedByTaskId}
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
      <DragOverlay>
        {activeTask ? (
          <div className="task-card task-card--overlay">{activeTask.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
