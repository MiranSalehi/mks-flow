import type { TaskLog } from '../models/TaskLog';
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../models/Task';
import type { TaskStatus } from '../types';

/** Persistence contract for tasks and their audit logs. */
export interface ITaskRepository {
  /** Returns every task across all projects. */
  findAll(): Task[];
  /** Returns all tasks belonging to a project. */
  findByProjectId(projectId: string): Task[];
  /** Returns tasks in a project with a specific status. */
  findByStatus(projectId: string, status: TaskStatus): Task[];
  /** Returns a task by id, or null if not found. */
  findById(id: string): Task | null;
  /** Full-text and filter search within a project. */
  search(projectId: string, query: string, filters: TaskFilters): Task[];
  /** Creates and persists a new task. */
  create(data: CreateTaskDto): Task;
  /** Applies partial updates to an existing task. */
  update(id: string, data: UpdateTaskDto): Task;
  /** Updates only the task status column. */
  updateStatus(id: string, status: TaskStatus): Task;
  /** Sets timer_started_at to now for the given task. */
  startTimer(id: string): Task;
  /** Clears timer_started_at and accumulates elapsed time. */
  stopTimer(id: string): Task;
  /** Permanently removes a task. */
  delete(id: string): void;
  /** Records a status transition in the task log. */
  logTransition(
    taskId: string,
    from: TaskStatus | null,
    to: TaskStatus,
    message: string,
  ): void;
  /** Returns chronological log entries for a task. */
  getTaskLogs(taskId: string): TaskLog[];
}
