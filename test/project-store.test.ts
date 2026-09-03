import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSqliteProjectStore,
  type ProjectListQuery,
  type ProjectSeed,
  type ProjectStore,
} from "../server/project-store";

const seeds: ProjectSeed[] = [
  {
    description: "First durable project.",
    id: "alpha",
    name: "Alpha",
    owner: "Platform",
    status: "active",
    updated: "2026-08-30",
  },
  {
    description: "Second durable project.",
    id: "bravo",
    name: "Bravo",
    owner: "Runtime",
    status: "planning",
    updated: "2026-08-29",
  },
  {
    description: "A literal 100% and under_score search target.",
    id: "charlie",
    name: "Charlie",
    owner: "Platform",
    status: "paused",
    updated: "2026-08-28",
  },
];

const baseQuery: ProjectListQuery = {
  groupBy: "none",
  limit: 20,
  offset: 0,
  owner: "all",
  query: "",
  sorts: [],
  status: "all",
};

const stores: ProjectStore[] = [];
const directories: string[] = [];

function memoryStore(seedCount = seeds.length): ProjectStore {
  const store = createSqliteProjectStore({ path: ":memory:", seed: seeds, seedCount });
  stores.push(store);
  return store;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const store of stores.splice(0)) store.close();
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("SQLite project store", () => {
  it("applies migrations and supplies the deterministic production-sized seed", () => {
    const store = memoryStore(2_500);
    const result = store.list({ ...baseQuery, limit: 200 });
    expect(result.total).toBe(2_500);
    expect(result.items).toHaveLength(200);
    expect(result.items.slice(0, 4).map((project) => project.id)).toEqual([
      "alpha",
      "bravo",
      "charlie",
      "project-0001",
    ]);
    expect(store.owners()).toEqual(["Platform", "Runtime"]);
  });

  it("generates exact deterministic rows from sorted owners and falls back for an empty baseline", () => {
    const baseline: ProjectSeed[] = [
      { ...seeds[1]!, owner: "Runtime" },
      { ...seeds[0]!, owner: "Platform" },
      { ...seeds[2]!, owner: "Design" },
    ];
    const store = createSqliteProjectStore({ path: ":memory:", seed: baseline, seedCount: 6 });
    stores.push(store);

    expect(store.list({ ...baseQuery, limit: 200 }).items.slice(3)).toEqual([
      {
        description: "Deterministic project 0001 used to prove durable large-data table queries.",
        id: "project-0001",
        name: "Project 0001",
        owner: "Design",
        status: "active",
        updated: "2021-01-01",
        version: 1,
      },
      {
        description: "Deterministic project 0002 used to prove durable large-data table queries.",
        id: "project-0002",
        name: "Project 0002",
        owner: "Platform",
        status: "planning",
        updated: "2021-01-02",
        version: 1,
      },
      {
        description: "Deterministic project 0003 used to prove durable large-data table queries.",
        id: "project-0003",
        name: "Project 0003",
        owner: "Runtime",
        status: "paused",
        updated: "2021-01-03",
        version: 1,
      },
    ]);

    const fallback = createSqliteProjectStore({ path: ":memory:", seed: [], seedCount: 1 });
    stores.push(fallback);
    expect(fallback.list({ ...baseQuery, limit: 1 }).items).toEqual([
      {
        description: "Deterministic project 0001 used to prove durable large-data table queries.",
        id: "project-0001",
        name: "Project 0001",
        owner: "Platform",
        status: "active",
        updated: "2021-01-01",
        version: 1,
      },
    ]);
  });

  it("combines escaped search, facets, ordered sorts, offsets, and stable ties", () => {
    const store = memoryStore(30);
    expect(store.list({ ...baseQuery, query: "%" }).items.map((project) => project.id)).toEqual([
      "charlie",
    ]);
    expect(store.list({ ...baseQuery, query: "_" }).items.map((project) => project.id)).toEqual([
      "charlie",
    ]);

    const escaped = createSqliteProjectStore({
      path: ":memory:",
      seed: [{ ...seeds[0]!, description: "A literal back\\slash search target." }, seeds[1]!],
      seedCount: 2,
    });
    stores.push(escaped);
    expect(escaped.list({ ...baseQuery, query: "\\" }).items.map((project) => project.id)).toEqual([
      "alpha",
    ]);

    const filters = memoryStore();
    expect(filters.list(baseQuery).items.map((project) => project.id)).toEqual([
      "alpha",
      "bravo",
      "charlie",
    ]);
    expect(
      filters.list({ ...baseQuery, owner: "Platform" }).items.map((project) => project.id),
    ).toEqual(["alpha", "charlie"]);
    expect(
      filters.list({ ...baseQuery, status: "planning" }).items.map((project) => project.id),
    ).toEqual(["bravo"]);
    expect(filters.list({ ...baseQuery, owner: "Runtime", status: "active" }).items).toEqual([]);

    const result = store.list({
      ...baseQuery,
      limit: 3,
      offset: 1,
      owner: "Platform",
      sorts: [
        { direction: "ascending", key: "status" },
        { direction: "descending", key: "updated" },
      ],
    });
    expect(result.total).toBeGreaterThan(3);
    expect(result.items).toHaveLength(3);
    expect(result.items.map((project) => project.status)).toEqual(["active", "active", "active"]);
    expect(result.items[0]!.updated >= result.items[1]!.updated).toBe(true);
  });

  it("keeps empty search out of SQL and applies explicit direction with id-stable ties", () => {
    const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
    const store = memoryStore();
    store.list(baseQuery);
    const preparedSql = prepare.mock.calls.map(([sql]) => String(sql));
    expect(preparedSql.some((sql) => sql.includes(" LIKE "))).toBe(false);
    prepare.mockRestore();

    const tied: ProjectSeed[] = [
      { ...seeds[0]!, id: "zulu", name: "Same", owner: "Beta" },
      { ...seeds[1]!, id: "alpha", name: "Same", owner: "Beta", status: "active" },
      { ...seeds[2]!, id: "middle", name: "Able", owner: "Alpha", status: "active" },
    ];
    const tiedStore = createSqliteProjectStore({ path: ":memory:", seed: tied, seedCount: 3 });
    stores.push(tiedStore);
    expect(
      tiedStore
        .list({
          ...baseQuery,
          sorts: [{ direction: "ascending", key: "name" }],
        })
        .items.map((project) => project.id),
    ).toEqual(["middle", "alpha", "zulu"]);
    expect(
      tiedStore
        .list({
          ...baseQuery,
          sorts: [{ direction: "descending", key: "name" }],
        })
        .items.map((project) => project.id),
    ).toEqual(["alpha", "zulu", "middle"]);
  });

  it("configures exact SQLite pragmas and creates nested file-backed directories", async () => {
    const execute = vi.spyOn(DatabaseSync.prototype, "exec");
    const memory = memoryStore();
    expect(memory.get("alpha")).toBeDefined();
    expect(
      execute.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith("PRAGMA")),
    ).toEqual(["PRAGMA foreign_keys = ON", "PRAGMA busy_timeout = 5000"]);

    execute.mockClear();
    const directory = await mkdtemp(join(tmpdir(), "jqstar-project-store-pragmas-"));
    directories.push(directory);
    const file = createSqliteProjectStore({
      path: join(directory, "nested", "projects.sqlite"),
      seed: seeds,
      seedCount: seeds.length,
    });
    stores.push(file);
    expect(file.get("alpha")).toBeDefined();
    expect(
      execute.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith("PRAGMA")),
    ).toEqual([
      "PRAGMA foreign_keys = ON",
      "PRAGMA busy_timeout = 5000",
      "PRAGMA journal_mode = WAL",
    ]);
    execute.mockRestore();
  });

  it("returns complete group aggregates while paging group-ordered rows", () => {
    const store = memoryStore(30);
    const result = store.list({
      ...baseQuery,
      groupBy: "status",
      limit: 5,
      sorts: [{ direction: "descending", key: "updated" }],
    });
    expect(result.groups.reduce((count, group) => count + group.count, 0)).toBe(30);
    expect(result.groups.map((group) => group.key)).toEqual(["active", "paused", "planning"]);
    expect(new Set(result.items.map((project) => project.status))).toEqual(new Set(["active"]));
  });

  it("persists edits across reopen and rejects stale versions without overwriting", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jqstar-project-store-"));
    directories.push(directory);
    const path = join(directory, "projects.sqlite");
    const first = createSqliteProjectStore({ path, seed: seeds, seedCount: seeds.length });
    const updated = first.update("alpha", {
      name: "Alpha renamed",
      owner: "Runtime",
      status: "paused",
      updated: "2026-08-31",
      version: 1,
    });
    expect(updated).toMatchObject({
      project: { name: "Alpha renamed", version: 2 },
      status: "updated",
    });
    const conflict = first.update("alpha", {
      name: "Stale overwrite",
      owner: "Platform",
      status: "active",
      updated: "2026-09-01",
      version: 1,
    });
    expect(conflict).toMatchObject({
      project: { name: "Alpha renamed", version: 2 },
      status: "conflict",
    });
    expect(first.update("missing", { ...seeds[0]!, version: 1 })).toEqual({ status: "missing" });
    first.close();

    const second = createSqliteProjectStore({ path, seed: seeds, seedCount: seeds.length });
    stores.push(second);
    expect(second.get("alpha")).toMatchObject({
      name: "Alpha renamed",
      owner: "Runtime",
      status: "paused",
      version: 2,
    });
  });

  it("rolls back failed migrations, seeds, and updates", async () => {
    const execute = vi.spyOn(DatabaseSync.prototype, "exec");
    const directory = await mkdtemp(join(tmpdir(), "jqstar-project-store-failures-"));
    directories.push(directory);
    const incompatiblePath = join(directory, "incompatible.sqlite");
    const incompatible = new DatabaseSync(incompatiblePath);
    incompatible.exec("CREATE TABLE projects (id TEXT)");
    incompatible.close();

    expect(() =>
      createSqliteProjectStore({
        path: incompatiblePath,
        seed: seeds,
        seedCount: seeds.length,
      }),
    ).toThrow();
    expect(execute.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
    execute.mockClear();
    const rejectedSeedPath = join(directory, "rejected-seed.sqlite");
    const rejectedSeed = new DatabaseSync(rejectedSeedPath);
    rejectedSeed.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT);
      INSERT INTO schema_migrations (version, applied_at) VALUES (1, CURRENT_TIMESTAMP);
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT,
        owner TEXT,
        status TEXT,
        updated TEXT,
        description TEXT,
        version INTEGER,
        sort_index INTEGER UNIQUE
      );
      CREATE TRIGGER reject_seed BEFORE INSERT ON projects
      BEGIN
        SELECT RAISE(ABORT, 'seed blocked');
      END;
    `);
    rejectedSeed.close();
    expect(() =>
      createSqliteProjectStore({
        path: rejectedSeedPath,
        seed: seeds,
        seedCount: seeds.length,
      }),
    ).toThrow("seed blocked");
    expect(execute.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
    execute.mockClear();

    const store = memoryStore();
    expect(() =>
      store.update("alpha", {
        name: "Alpha",
        owner: "x".repeat(81),
        status: "active",
        updated: "2026-08-31",
        version: 1,
      }),
    ).toThrow();
    expect(execute.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK");
    expect(store.get("alpha")).toMatchObject({ owner: "Platform", version: 1 });
    expect(
      store.update("alpha", {
        name: "Recovered",
        owner: "Platform",
        status: "active",
        updated: "2026-08-31",
        version: 1,
      }),
    ).toMatchObject({ project: { name: "Recovered", version: 2 }, status: "updated" });
    execute.mockRestore();
  });

  it("keeps representative large-dataset queries inside the local performance budget", () => {
    const store = memoryStore(2_500);
    const durations: number[] = [];
    for (let index = 0; index < 100; index += 1) {
      const started = performance.now();
      store.list({
        ...baseQuery,
        groupBy: index % 2 === 0 ? "owner" : "none",
        limit: 80,
        offset: (index * 23) % 2_400,
        query: index % 3 === 0 ? "project" : "",
        sorts: [
          { direction: index % 2 === 0 ? "ascending" : "descending", key: "updated" },
          { direction: "ascending", key: "name" },
        ],
      });
      durations.push(performance.now() - started);
    }
    durations.sort((left, right) => left - right);
    expect(durations[Math.floor(durations.length * 0.95)]).toBeLessThan(75);
  });
});
