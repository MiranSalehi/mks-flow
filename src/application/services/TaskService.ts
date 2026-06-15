import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { TaskLog } from '../../domain/models/TaskLog';
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../../domain/models/Task';
import type { TaskStatus } from '../../domain/types';
import { TaskTransitionError } from '../errors';
import type { TaskImageService } from './TaskImageService';
import type { TimerService } from './TimerService';

const TRANSITION_MESSAGES: Record<string, string> = {
  'todo->doing': 'Task started',
  'doing->test': 'Ready for test',
  'test->done': 'Task approved',
  'doing->todo': 'Moved back to Todo',
  'test->doing': 'Moved back to Doing',
};

/**
 * Orchestrates task CRUD and validated lifecycle transitions.
 */
export class TaskService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly timerService?: TimerService,
    private readonly taskImageService?: TaskImageService,
  ) {}

  /** Returns all tasks. */
  findAll(): Task[] {
    return this.taskRepository.findAll();
  }

  /** Returns tasks for a project. */
  findByProjectId(projectId: string): Task[] {
    return this.taskRepository.findByProjectId(projectId);
  }

  /** Returns a task by id. */
  findById(id: string): Task | null {
    return this.taskRepository.findById(id);
  }

  /** Creates a task after verifying the project exists. */
  create(data: CreateTaskDto): Task {
    const project = this.projectRepository.findById(data.projectId);
    if (!project) {
      throw new TaskTransitionError(`Project not found: ${data.projectId}`);
    }

    return this.taskRepository.create(data);
  }

  /** Updates a task. */
  update(id: string, data: UpdateTaskDto): Task {
    return this.taskRepository.update(id, data);
  }

  /** Deletes a task, stopping any active timer first. */
  delete(id: string): void {
    const task = this.taskRepository.findById(id);
    if (task?.timerStartedAt) {
      this.timerService?.stopTimer(id);
    }

    this.taskImageService?.deleteAllForTask(id);
    this.taskRepository.delete(id);
  }

  /** Moves a task from todo to doing and starts its timer. */
  startTask(taskId: string): Task {
    return this.transition(taskId, 'todo', 'doing', () => {
      const task = this.taskRepository.updateStatus(taskId, 'doing');
      this.timerService?.startTimer(taskId);
      return task;
    });
  }

  /** Moves a task from doing to test and stops its timer. */
  readyForTest(taskId: string): Task {
    return this.transition(taskId, 'doing', 'test', () => {
      this.timerService?.stopTimer(taskId);
      return this.taskRepository.updateStatus(taskId, 'test');
    });
  }

  /** Moves a task from test to done. */
  approveTask(taskId: string): Task {
    return this.transition(taskId, 'test', 'done', () =>
      this.taskRepository.updateStatus(taskId, 'done'),
    );
  }

  /** Moves a task from doing back to todo and stops its timer. */
  revertToTodo(taskId: string): Task {
    return this.transition(taskId, 'doing', 'todo', () => {
      this.timerService?.stopTimer(taskId);
      return this.taskRepository.updateStatus(taskId, 'todo');
    });
  }

  /** Moves a task from test back to doing and restarts its timer. */
  revertToDoing(taskId: string): Task {
    return this.transition(taskId, 'test', 'doing', () => {
      const task = this.taskRepository.updateStatus(taskId, 'doing');
      this.timerService?.startTimer(taskId);
      return task;
    });
  }

  /**
   * Applies an allowed status change. Done tasks are locked; only test may move to done.
   */
  moveToStatus(
    taskId: string,
    toStatus: TaskStatus,
    insertAt?: number,
  ): Task {
    const task = this.taskRepository.findById(taskId);
    if (!task) {
      throw new TaskTransitionError(`Task not found: ${taskId}`);
    }

    if (task.status === 'done') {
      throw new TaskTransitionError('Done tasks cannot be moved');
    }

    if (task.status === toStatus) {
      return task;
    }

    let updated: Task;
    switch (`${task.status}->${toStatus}`) {
      case 'todo->doing':
        updated = this.startTask(taskId);
        break;
      case 'doing->test':
        updated = this.readyForTest(taskId);
        break;
      case 'test->done':
        updated = this.approveTask(taskId);
        break;
      case 'doing->todo':
        updated = this.revertToTodo(taskId);
        break;
      case 'test->doing':
        updated = this.revertToDoing(taskId);
        break;
      default:
        throw new TaskTransitionError(
          `Cannot move task from "${task.status}" to "${toStatus}"`,
        );
    }

    if (insertAt !== undefined) {
      return this.insertTaskAt(updated.projectId, toStatus, taskId, insertAt);
    }

    return updated;
  }

  /** Reorders tasks within a single status column. */
  reorderTasks(
    projectId: string,
    status: TaskStatus,
    taskIds: string[],
  ): void {
    this.taskRepository.reorderTasks(projectId, status, taskIds);
  }

  /** Returns task logs for a task. */
  getTaskLogs(taskId: string): TaskLog[] {
    return this.taskRepository.getTaskLogs(taskId);
  }

  /** Searches tasks within a project. */
  search(projectId: string, query: string, filters: TaskFilters): Task[] {
    return this.taskRepository.search(projectId, query, filters);
  }

  private insertTaskAt(
    projectId: string,
    status: TaskStatus,
    taskId: string,
    insertAt: number,
  ): Task {
    const columnTasks = this.taskRepository.findByStatus(projectId, status);
    const orderedIds = columnTasks
      .map((item) => item.id)
      .filter((id) => id !== taskId);
    const index = Math.max(0, Math.min(insertAt, orderedIds.length));
    orderedIds.splice(index, 0, taskId);
    this.taskRepository.reorderTasks(projectId, status, orderedIds);
    return this.taskRepository.findById(taskId)!;
  }

  private transition(
    taskId: string,
    from: TaskStatus,
    to: TaskStatus,
    apply: () => Task,
  ): Task {
    const task = this.taskRepository.findById(taskId);
    if (!task) {
      throw new TaskTransitionError(`Task not found: ${taskId}`);
    }

    if (task.status !== from) {
      throw new TaskTransitionError(
        `Cannot move task from "${task.status}" — expected "${from}"`,
      );
    }

    const updated = apply();
    const message =
      TRANSITION_MESSAGES[`${from}->${to}`] ?? `Status changed to ${to}`;

    this.taskRepository.logTransition(taskId, from, to, message);
    return updated;
  }
}
