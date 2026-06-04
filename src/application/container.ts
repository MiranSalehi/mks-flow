import type Database from 'better-sqlite3';
import * as vscode from 'vscode';
import type { IAIProvider } from '../domain/interfaces/IAIProvider';
import type { IProjectRepository } from '../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../domain/interfaces/ITaskRepository';
import { ClipboardAIAdapter } from '../infrastructure/ai/adapters/ClipboardAIAdapter';
import { CursorComposerAdapter } from '../infrastructure/ai/adapters/CursorComposerAdapter';
import { CursorComposerService } from '../infrastructure/ai/CursorComposerService';
import { ProjectRepository } from '../infrastructure/repositories/ProjectRepository';
import { TaskRepository } from '../infrastructure/repositories/TaskRepository';
import { AIPromptService } from './services/AIPromptService';
import { ExportService } from './services/ExportService';
import { GitService } from './services/GitService';
import { ProjectService } from './services/ProjectService';
import { TaskContextFileService } from './services/TaskContextFileService';
import { TaskImageService } from './services/TaskImageService';
import { TaskService } from './services/TaskService';
import { TimerService } from './services/TimerService';

/**
 * Dependency injection container wiring repositories and services.
 */
export class Container {
  readonly projectRepository: IProjectRepository;
  readonly taskRepository: ITaskRepository;
  readonly projectService: ProjectService;
  readonly taskService: TaskService;
  readonly aiPromptService: AIPromptService;
  readonly taskContextFileService: TaskContextFileService;
  readonly gitService: GitService;
  readonly timerService: TimerService;
  readonly exportService: ExportService;
  readonly taskImageService: TaskImageService;
  readonly aiProvider: IAIProvider;

  private constructor(
    projectRepository: IProjectRepository,
    taskRepository: ITaskRepository,
    aiProvider: IAIProvider,
    aiPromptService: AIPromptService,
    taskContextFileService: TaskContextFileService,
  ) {
    this.projectRepository = projectRepository;
    this.taskRepository = taskRepository;
    this.aiProvider = aiProvider;
    this.aiPromptService = aiPromptService;
    this.taskContextFileService = taskContextFileService;

    this.timerService = new TimerService(taskRepository);
    this.taskImageService = new TaskImageService(taskRepository);
    this.projectService = new ProjectService(projectRepository);
    this.taskService = new TaskService(
      taskRepository,
      projectRepository,
      this.timerService,
      this.taskImageService,
    );
    this.gitService = new GitService();
    this.exportService = new ExportService(
      projectRepository,
      taskRepository,
    );
  }

  /** Creates a fully wired container from an open database connection. */
  static create(db: Database.Database): Container {
    const projectRepository = new ProjectRepository(db);
    const taskRepository = new TaskRepository(db);
    const aiPromptService = new AIPromptService();
    const taskContextFileService = new TaskContextFileService(aiPromptService);
    const cursorComposerService = new CursorComposerService();
    const aiProvider = Container.resolveAiProvider(
      taskContextFileService,
      cursorComposerService,
    );

    return new Container(
      projectRepository,
      taskRepository,
      aiProvider,
      aiPromptService,
      taskContextFileService,
    );
  }

  /** Resumes any timer that was active before the extension restarted. */
  resumeTimers(): void {
    this.timerService.resumeActiveTimer();
  }

  private static resolveAiProvider(
    taskContextFileService: TaskContextFileService,
    cursorComposerService: CursorComposerService,
  ): IAIProvider {
    const providerId = vscode.workspace
      .getConfiguration('mksflow')
      .get<string>('aiProvider', 'cursor');

    if (providerId === 'clipboard') {
      return new ClipboardAIAdapter();
    }

    return new CursorComposerAdapter(
      taskContextFileService,
      cursorComposerService,
    );
  }
}
