import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type {
  CreateProjectDto,
  Project,
  UpdateProjectDto,
} from '../../domain/models/Project';

/**
 * Application service for project CRUD operations.
 */
export class ProjectService {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /** Returns all projects ordered by name. */
  findAll(): Project[] {
    return this.projectRepository.findAll();
  }

  /** Returns a project by id. */
  findById(id: string): Project | null {
    return this.projectRepository.findById(id);
  }

  /** Creates a new project. */
  create(data: CreateProjectDto): Project {
    return this.projectRepository.create(data);
  }

  /** Updates an existing project. */
  update(id: string, data: UpdateProjectDto): Project {
    return this.projectRepository.update(id, data);
  }

  /** Deletes a project and its tasks. */
  delete(id: string): void {
    this.projectRepository.delete(id);
  }
}
