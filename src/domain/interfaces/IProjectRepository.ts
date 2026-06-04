import type {
  CreateProjectDto,
  Project,
  UpdateProjectDto,
} from '../models/Project';

/** Persistence contract for projects — SQLite in Phase 1, API in Phase 2. */
export interface IProjectRepository {
  /** Returns all projects ordered by name. */
  findAll(): Project[];
  /** Returns a project by id, or null if not found. */
  findById(id: string): Project | null;
  /** Creates and persists a new project. */
  create(data: CreateProjectDto): Project;
  /** Applies partial updates to an existing project. */
  update(id: string, data: UpdateProjectDto): Project;
  /** Deletes a project and its tasks (cascade). */
  delete(id: string): void;
}
