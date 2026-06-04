import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_DIR_NAME = 'mksflow';
const DB_FILE_NAME = 'mksflow.db';
const DEFAULT_MIGRATIONS_DIR = 'migrations';

/**
 * Thrown when the SQLite database cannot be opened or migrated.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  /** Returns a user-facing message including the underlying cause. */
  getDisplayMessage(): string {
    const cause = formatUnknownError(this.cause);
    if (!cause) {
      return this.message;
    }

    if (cause.includes('NODE_MODULE_VERSION')) {
      const hostAbi = process.versions.modules ?? 'unknown';
      return (
        `${this.message}: native SQLite module was built for a different Node/Electron version ` +
        `(extension host ABI ${hostAbi}). ` +
        'Run "npm run rebuild:electron" in the project root, then reload the window. ' +
        `If it persists, set MKSFLOW_TARGET_ABI=${hostAbi} npm run rebuild:electron.`
      );
    }

    return `${this.message}: ${cause}`;
  }
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

/**
 * Singleton wrapper around better-sqlite3.
 * Manages connection lifecycle, WAL mode, and schema migrations.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;

  public readonly db: Database.Database;
  private readonly dbPath: string;

  private constructor(db: Database.Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  /**
   * Returns the shared database manager, creating the connection on first call.
   *
   * @param storagePath - VS Code globalStoragePath or custom directory root
   * @param migrationsDir - Optional path to SQL migration files (defaults to dist/migrations)
   */
  public static getInstance(
    storagePath: string,
    migrationsDir?: string,
  ): DatabaseManager {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    try {
      const dbPath = DatabaseManager.resolveDbPath(storagePath);
      DatabaseManager.ensureDirectory(path.dirname(dbPath));

      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      const resolvedMigrationsDir =
        migrationsDir ?? path.join(__dirname, DEFAULT_MIGRATIONS_DIR);

      DatabaseManager.runMigrations(db, resolvedMigrationsDir);

      DatabaseManager.instance = new DatabaseManager(db, dbPath);
      return DatabaseManager.instance;
    } catch (error) {
      throw new DatabaseError('Failed to initialize MKSFlow database', error);
    }
  }

  /** Absolute path to the SQLite database file. */
  public getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Closes the database connection and clears the singleton instance.
   */
  public close(): void {
    this.db.close();
    DatabaseManager.instance = null;
  }

  /**
   * Clears the singleton without closing — for tests only.
   * @internal
   */
  public static resetForTests(): void {
    DatabaseManager.instance = null;
  }

  private static resolveDbPath(storagePath: string): string {
    const normalized = storagePath.trim();
    if (!normalized) {
      throw new DatabaseError('Storage path cannot be empty');
    }

    const isFile = normalized.endsWith('.db');
    if (isFile) {
      return path.resolve(normalized);
    }

    return path.join(path.resolve(normalized), DB_DIR_NAME, DB_FILE_NAME);
  }

  private static ensureDirectory(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  private static runMigrations(
    db: Database.Database,
    migrationsDir: string,
  ): void {
    if (!fs.existsSync(migrationsDir)) {
      throw new DatabaseError(
        `Migrations directory not found: ${migrationsDir}`,
      );
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          TEXT PRIMARY KEY,
        applied_at  TEXT NOT NULL
      );
    `);

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const insertMigration = db.prepare(`
      INSERT INTO schema_migrations (id, applied_at)
      VALUES (?, ?)
    `);

    const hasMigration = db.prepare(`
      SELECT id FROM schema_migrations WHERE id = ?
    `);

    for (const file of migrationFiles) {
      const migrationId = path.basename(file, '.sql');
      const alreadyApplied = hasMigration.get(migrationId);

      if (alreadyApplied) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const applyMigration = db.transaction(() => {
        db.exec(sql);
        insertMigration.run(migrationId, new Date().toISOString());
      });

      applyMigration();
    }
  }
}
