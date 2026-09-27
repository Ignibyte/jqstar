import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const report = JSON.parse(await readFile("quality/inspection-decision.json", "utf8"));
const schema = JSON.parse(await readFile("schema/inspection.schema.json", "utf8"));
const validate = createSchemaValidator(schema);

describe("DevTools decision evidence", () => {
  it("binds two distinct installed application investigations to their current fixture inputs", async () => {
    expect(report.schema).toBe("jqstar-inspection-investigations/1");
    expect(report.status).toBe("pass");
    expect(report.package.name).toBe("jquery-star");
    expect(report.package.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.backendRequests).toBe(6);
    expect(report.rows).toHaveLength(6);
    for (const [path, expected] of Object.entries(report.inputs)) {
      const actual = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      expect(actual, path).toBe(expected);
    }
    expect(report.absence).toEqual({
      devtoolsExport: false,
      devtoolsPackedFiles: 0,
      repositoryRuntimeImports: 0,
    });
    for (const app of ["project-browser", "audit-log"]) {
      const rows = report.rows.filter((row) => row.app === app);
      expect(rows.map((row) => row.engine)).toEqual(["chromium", "firefox", "webkit"]);
      expect(report.graphs[app]).toContain("node_modules/jquery-star/dist/inspect.js");
      expect(report.graphs[app].every((path) => !path.startsWith("../"))).toBe(true);
    }
  });

  it.each(report.rows)(
    "$engine $app retains schema-valid diagnosis, correction, and cleanup",
    (row) => {
      expect(row.resolved).toBe(true);
      expect(row.publicReads).toBe(4);
      expect(row.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(row.version).toMatch(/^\d+\./);
      for (const key of ["before", "fault", "corrected", "terminal"]) {
        expect(validate(row[key]), JSON.stringify(validate.errors)).toBe(true);
        expect(JSON.stringify(row[key])).not.toMatch(
          /private-investigation|\/api\/|auditLog\.refresh/,
        );
      }
      expect(row.cleanup).toEqual({ failed: 0, remaining: 0 });
      expect(row.terminal.lifecycle).toBe("disposed");
      expect(row.terminal.kernel).toBeNull();
      expect(row.terminal.trace.entries).toBe(0);
      if (row.app === "project-browser") {
        expect(row.fault.kernel.applications.length).toBe(
          row.before.kernel.applications.length + 1,
        );
        expect(row.corrected.kernel.applications).toHaveLength(1);
      } else {
        const failed = row.fault.records.find(
          (record) => record.kind === "request" && record.status === 503,
        );
        expect(failed.outcome).toBe("failed");
        expect(
          row.fault.records.some(
            (record) => record.kind === "action" && record.id === failed.parentId,
          ),
        ).toBe(true);
        expect(
          row.corrected.records.some(
            (record) => record.kind === "request" && record.outcome === "completed",
          ),
        ).toBe(true);
      }
    },
  );

  it("keeps the declined export absent and the research fixture out of production", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    expect(manifest.exports["./devtools"]).toBeUndefined();
    expect(manifest.files).not.toContain("test/fixtures/inspection-investigations.mjs");
    const fixture = await readFile("test/fixtures/inspection-investigations.mjs", "utf8");
    expect(fixture).not.toMatch(/src\/|\.metadata\(|\.allowField\(|\.denyField\(/);
  });
});
