import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const projectStatuses = ["active", "planning", "paused"] as const;
export const projectSortKeys = ["name", "owner", "status", "updated"] as const;
export const projectSortDirections = ["ascending", "descending"] as const;
export const projectGroupKeys = ["none", "owner", "status"] as const;

type ProjectStatus = (typeof projectStatuses)[number];
type ProjectSortKey = (typeof projectSortKeys)[number];
type ProjectSortDirection = (typeof projectSortDirections)[number];
export type ProjectGroupKey = (typeof projectGroupKeys)[number];

export interface ProjectSeed {
  description: string;
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  updated: string;
}

export interface ProjectRecord extends ProjectSeed {
  version: number;
}

export interface ProjectSort {
  direction: ProjectSortDirection;
  key: ProjectSortKey;
}

export interface ProjectListQuery {
  groupBy: ProjectGroupKey;
  limit: number;
  offset: number;
  owner: string;
  query: string;
  sorts: readonly ProjectSort[];
  status: string;
}

interface ProjectGroup {
  count: number;
  key: string;
}

interface ProjectListResult {
  groups: ProjectGroup[];
  items: ProjectRecord[];
  total: number;
}

export interface ProjectUpdate {
  name: string;
  owner: string;
  status: ProjectStatus;
  updated: string;
  version: number;
}

type ProjectUpdateResult =
  | { project: ProjectRecord; status: "conflict" }
  | { status: "missing" }
  | { project: ProjectRecord; status: "updated" };

export interface ProjectStore {
  close(): void;
  get(id: string): ProjectRecord | undefined;
  list(query: ProjectListQuery): ProjectListResult;
  owners(): string[];
  update(id: string, update: ProjectUpdate): ProjectUpdateResult;
}

export interface SqliteProjectStoreOptions {
  path: string;
  seed: readonly ProjectSeed[];
  seedCount?: number;
}

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        owner TEXT NOT NULL CHECK (length(owner) BETWEEN 1 AND 80),
        status TEXT NOT NULL CHECK (status IN ('active', 'planning', 'paused')),
        updated TEXT NOT NULL CHECK (updated GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 500),
        version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
        sort_index INTEGER NOT NULL UNIQUE
      );
      CREATE INDEX projects_owner_idx ON projects(owner COLLATE NOCASE);
      CREATE INDEX projects_status_idx ON projects(status);
      CREATE INDEX projects_updated_idx ON projects(updated);
    `,
  },
] as const;

const sortSql: Readonly<Record<ProjectSortKey, string>> = {
  name: "name COLLATE NOCASE",
  owner: "owner COLLATE NOCASE",
  status: "status",
  updated: "updated",
};

function row(value: unknown): ProjectRecord {
  const source = value as Record<string, unknown>;
  return {
    description: String(source.description),
    id: String(source.id),
    name: String(source.name),
    owner: String(source.owner),
    status: String(source.status) as ProjectStatus,
    updated: String(source.updated),
    version: Number(source.version),
  };
}

function rollback(database: DatabaseSync): void {
  database.exec("ROLLBACK");
}

function migrate(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const applied = database.prepare("SELECT version FROM schema_migrations").all();
  const versions = new Set(applied.map((entry) => Number((entry as { version: unknown }).version)));
  for (const migration of migrations) {
    if (versions.has(migration.version)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      database.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(migration.version);
      database.exec("COMMIT");
    } catch (error) {
      rollback(database);
      throw error;
    }
  }
}

function generatedSeed(index: number, owners: readonly string[]): ProjectSeed {
  const number = String(index).padStart(4, "0");
  const owner = owners[(index - 1) % owners.length] ?? "Platform";
  const status = projectStatuses[(index - 1) % projectStatuses.length]!;
  const dayOffset = (index - 1) % 1_825;
  const date = new Date(Date.UTC(2021, 0, 1 + dayOffset)).toISOString().slice(0, 10);
  return {
    description: `Deterministic project ${number} used to prove durable large-data table queries.`,
    id: `project-${number}`,
    name: `Project ${number}`,
    owner,
    status,
    updated: date,
  };
}

function seed(
  database: DatabaseSync,
  baseline: readonly ProjectSeed[],
  requestedCount: number,
): void {
  const count = Math.max(requestedCount, baseline.length);
  const owners = [...new Set(baseline.map((project) => project.owner))].sort((left, right) =>
    left.localeCompare(right),
  );
  const insert = database.prepare(`
    INSERT OR IGNORE INTO projects
      (id, name, owner, status, updated, description, version, sort_index)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const [offset, project] of baseline.entries()) {
      insert.run(
        project.id,
        project.name,
        project.owner,
        project.status,
        project.updated,
        project.description,
        offset,
      );
    }
    for (let index = 1; index <= count - baseline.length; index += 1) {
      const project = generatedSeed(index, owners);
      insert.run(
        project.id,
        project.name,
        project.owner,
        project.status,
        project.updated,
        project.description,
        10_000 + index,
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    rollback(database);
    throw error;
  }
}

function likeValue(value: string): string {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

function where(query: ProjectListQuery): { parameters: string[]; sql: string } {
  const clauses: string[] = [];
  const parameters: string[] = [];
  if (query.owner !== "all") {
    clauses.push("owner = ?");
    parameters.push(query.owner);
  }
  if (query.status !== "all") {
    clauses.push("status = ?");
    parameters.push(query.status);
  }
  if (query.query) {
    clauses.push(
      "lower(name || ' ' || owner || ' ' || status || ' ' || description) LIKE lower(?) ESCAPE '\\'",
    );
    parameters.push(likeValue(query.query));
  }
  return {
    parameters,
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
  };
}

function orderBy(query: ProjectListQuery): string {
  const clauses: string[] = [];
  if (query.groupBy !== "none") clauses.push(`${sortSql[query.groupBy]} ASC`);
  for (const sort of query.sorts) {
    const expression = sortSql[sort.key];
    const clause = sort.direction === "descending" ? `${expression} DESC` : expression;
    clauses.push(clause);
  }
  clauses.push(query.sorts.length === 0 ? "sort_index ASC" : "id ASC");
  return ` ORDER BY ${clauses.join(", ")}`;
}

export function createSqliteProjectStore(options: SqliteProjectStoreOptions): ProjectStore {
  const path = options.path;
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  if (path !== ":memory:") database.exec("PRAGMA journal_mode = WAL");
  migrate(database);
  seed(database, options.seed, options.seedCount ?? 2_500);

  return {
    close(): void {
      database.close();
    },

    get(id: string): ProjectRecord | undefined {
      const value = database
        .prepare(
          "SELECT id, name, owner, status, updated, description, version FROM projects WHERE id = ?",
        )
        .get(id);
      return value ? row(value) : undefined;
    },

    list(query: ProjectListQuery): ProjectListResult {
      const filter = where(query);
      const totalValue = database
        .prepare(`SELECT count(*) AS count FROM projects${filter.sql}`)
        .get(...filter.parameters) as { count: number | bigint };
      const limit = Math.min(Math.max(Math.floor(query.limit), 1), 200);
      const offset = Math.max(Math.floor(query.offset), 0);
      const values = database
        .prepare(
          `SELECT id, name, owner, status, updated, description, version FROM projects${filter.sql}${orderBy(query)} LIMIT ? OFFSET ?`,
        )
        .all(...filter.parameters, limit, offset);
      let groups: ProjectGroup[] = [];
      if (query.groupBy !== "none") {
        const groupColumn = sortSql[query.groupBy];
        groups = database
          .prepare(
            `SELECT ${groupColumn} AS key, count(*) AS count FROM projects${filter.sql} GROUP BY ${groupColumn} ORDER BY ${groupColumn} ASC`,
          )
          .all(...filter.parameters)
          .map((value) => {
            const source = value as Record<string, unknown>;
            return { count: Number(source.count), key: String(source.key) };
          });
      }
      return {
        groups,
        items: values.map(row),
        total: Number(totalValue.count),
      };
    },

    owners(): string[] {
      return database
        .prepare("SELECT DISTINCT owner FROM projects ORDER BY owner COLLATE NOCASE")
        .all()
        .map((value) => String((value as { owner: unknown }).owner));
    },

    update(id: string, update: ProjectUpdate): ProjectUpdateResult {
      database.exec("BEGIN IMMEDIATE");
      try {
        const value = database
          .prepare(
            `
            UPDATE projects
            SET name = ?, owner = ?, status = ?, updated = ?, version = version + 1
            WHERE id = ? AND version = ?
            RETURNING id, name, owner, status, updated, description, version
          `,
          )
          .get(update.name, update.owner, update.status, update.updated, id, update.version);
        if (value) {
          database.exec("COMMIT");
          return { project: row(value), status: "updated" };
        }
        const current = database
          .prepare(
            "SELECT id, name, owner, status, updated, description, version FROM projects WHERE id = ?",
          )
          .get(id);
        database.exec("COMMIT");
        return current ? { project: row(current), status: "conflict" } : { status: "missing" };
      } catch (error) {
        rollback(database);
        throw error;
      }
    },
  };
}
