import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateProjectDto,
  Project,
  UpdateProjectDto,
} from '../../domain/models/Project';
import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import {
  mapProjectRow,
  toIsoString,
  type ProjectRow,
} from './mappers';
import { RepositoryError, wrapRepositoryError } from './RepositoryError';

/**
 * SQLite-backed implementation of {@link IProjectRepository}.
 */
export class ProjectRepository implements IProjectRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  findAll(): Project[] {
    try {
      const rows = this.db
        .prepare(
          `SELECT id, name, description, mode, color, created_at, updated_at
           FROM projects
           ORDER BY name COLLATE NOCASE ASC`,
        )
        .all() as ProjectRow[];

      return rows.map(mapProjectRow);
    } catch (error) {
      throw wrapRepositoryError('Failed to load projects', error);
    }
  }

  /** @inheritdoc */
  findById(id: string): Project | null {
    try {
      const row = this.db
        .prepare(
          `SELECT id, name, description, mode, color, created_at, updated_at
           FROM projects
           WHERE id = ?`,
        )
        .get(id) as ProjectRow | undefined;

      return row ? mapProjectRow(row) : null;
    } catch (error) {
      throw wrapRepositoryError(`Failed to load project ${id}`, error);
    }
  }

  /** @inheritdoc */
  create(data: CreateProjectDto): Project {
    const name = data.name.trim();
    if (!name) {
      throw new RepositoryError('Project name is required', 'VALIDATION');
    }

    const now = new Date();
    const project: Project = {
      id: uuidv4(),
      name,
      description: data.description?.trim() ?? '',
      mode: data.mode ?? 'personal',
      color: data.color ?? '#007ACC',
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.db
        .prepare(
          `INSERT INTO projects (
            id, name, description, mode, color, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          project.id,
          project.name,
          project.description,
          project.mode,
          project.color,
          toIsoString(project.createdAt),
          toIsoString(project.updatedAt),
        );

      return project;
    } catch (error) {
      throw wrapRepositoryError('Failed to create project', error);
    }
  }

  /** @inheritdoc */
  update(id: string, data: UpdateProjectDto): Project {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Project not found: ${id}`, 'NOT_FOUND');
    }

    const updated: Project = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description:
        data.description !== undefined
          ? data.description.trim()
          : existing.description,
      mode: data.mode ?? existing.mode,
      color: data.color ?? existing.color,
      updatedAt: new Date(),
    };

    if (!updated.name) {
      throw new RepositoryError('Project name cannot be empty', 'VALIDATION');
    }

    try {
      this.db
        .prepare(
          `UPDATE projects
           SET name = ?, description = ?, mode = ?, color = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          updated.name,
          updated.description,
          updated.mode,
          updated.color,
          toIsoString(updated.updatedAt),
          id,
        );

      return updated;
    } catch (error) {
      throw wrapRepositoryError(`Failed to update project ${id}`, error);
    }
  }

  /** @inheritdoc */
  delete(id: string): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Project not found: ${id}`, 'NOT_FOUND');
    }

    try {
      this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
    } catch (error) {
      throw wrapRepositoryError(`Failed to delete project ${id}`, error);
    }
  }
}
