import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  changedPaths,
  fingerprint,
  gatedPaths,
  gitDirectory,
  gitHead,
  repositoryRoot,
} from "../quality/lib/git-state.mjs";
import { createSchemaValidator } from "../quality/validate-json.mjs";
import { discoverClaimPaths, extractClaimCandidates } from "./claims.mjs";
import { sameKeys, sha256 } from "./contracts.mjs";
import { deterministicJson, readAuditFile, writeAuditSnapshot } from "./files.mjs";
import { deriveRequirements } from "./requirements.mjs";

const contractPath = "quality/program-audit/inputs.json";

export async function buildInventory(root) {
  const before = await fingerprint(root);
  const paths = await gatedPaths(root);
  const contractFile = await readAuditFile(root, contractPath);
  const contract = JSON.parse(contractFile.source);
  const contractSchema = JSON.parse(
    (await readAuditFile(root, "quality/program-audit/inputs.schema.json")).source,
  );
  assert(createSchemaValidator(contractSchema)(contract), "Invalid program audit input contract");
  sameKeys(discoverClaimPaths(paths), contract.claimSources, "Authoritative claim inputs");
  const ticketPaths = paths.filter((path) => /^docs\/tickets\/\d{4}-[a-z0-9-]+\.md$/u.test(path));
  const all = [
    ...new Set([...ticketPaths, ...contract.claimSources, ...contract.baselines, contractPath]),
  ].sort();
  const files = [];
  for (let offset = 0; offset < all.length; offset += 16)
    files.push(
      ...(await Promise.all(
        all
          .slice(offset, offset + 16)
          .map((path) => readAuditFile(root, path, { maximumBytes: 2 * 1024 * 1024 })),
      )),
    );
  assert(
    files.reduce((sum, file) => sum + file.bytes, 0) <= 16 * 1024 * 1024,
    "Audit input inventory exceeds its total bound",
  );
  const byPath = new Map(files.map((file) => [file.path, file]));
  const derived = deriveRequirements(
    ticketPaths.map((path) => byPath.get(path)),
    byPath.get(contract.program).source,
    contract.tickets,
  );
  assert(
    derived.requirements.length === contract.expectedRequirements,
    "Program requirement count changed; review the contract",
  );
  const claims = contract.claimSources.flatMap((path) =>
    extractClaimCandidates(path, byPath.get(path).source),
  );
  assert(
    new Set(claims.map(({ id }) => id)).size === claims.length,
    "Duplicate claim candidate identity",
  );
  const inventory = {
    schema: "jqstar-program-audit-inventory/1",
    status: "review-required",
    source: {
      head: await gitHead(root),
      mutableWorkspace: (await changedPaths(root)).length > 0,
      fingerprint: before,
    },
    inputs: files.map(({ path, sha256: digest, bytes }) => ({ path, sha256: digest, bytes })),
    tickets: derived.tickets.map(({ requirements, ...ticket }) => ({
      ...ticket,
      criteria: requirements.map(({ criterion }) => criterion),
    })),
    requirements: derived.requirements,
    claimCandidates: claims,
    unresolved: [
      "semantic-claim-review",
      "direct-requirement-mappings",
      "final-immutable-manifest",
      "current-evidence-execution",
      "nvda-windows",
      "voiceover-safari",
    ],
  };
  const schema = JSON.parse(
    (await readAuditFile(root, "quality/program-audit/inventory.schema.json")).source,
  );
  assert(createSchemaValidator(schema)(inventory), "Generated audit inventory is invalid");
  assert(
    deterministicJson(before) === deterministicJson(await fingerprint(root)),
    "Source changed during inventory derivation",
  );
  return inventory;
}

export function inventoryMarkdown(inventory) {
  const prerequisites = inventory.tickets.filter(({ role }) => role === "prerequisite");
  return [
    "# Program audit review inventory",
    "",
    "Status: review required. This is not a frozen release manifest or a passing program audit.",
    "",
    `Source: ${inventory.source.head}; workspace ${inventory.source.mutableWorkspace ? "has changes" : "is clean"}.`,
    "",
    `${prerequisites.length} terminal prerequisites; ${inventory.requirements.length} ticket/program requirements; ` +
      `${inventory.claimCandidates.length} authored claim candidates awaiting semantic review.`,
    "",
    "Candidate extraction records prose, examples, and declarations before selecting proof. It cannot establish that every promise has been understood or tested.",
    "",
    "Mutation ticket 0053 remains deferred. No evidence command is executed by this inventory command.",
    "",
    "| Ticket | Status | Criteria |",
    "| --- | --- | --- |",
    ...inventory.tickets.map(
      ({ id, status, criteria }) => `| ${id} | ${status} | ${criteria.length} |`,
    ),
    "",
    "## Required work",
    "",
    ...inventory.unresolved.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export async function inventoryCommand(args = process.argv.slice(2)) {
  assert(args.length === 0, "The inventory command accepts no options");
  const root = await repositoryRoot();
  const inventory = await buildInventory(root);
  const parent = join(await gitDirectory(root), "jqstar/program-audit/inventories");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const name = sha256(deterministicJson(inventory));
  await writeAuditSnapshot(parent, name, inventory, inventoryMarkdown(inventory));
  process.stdout.write(
    `Review inventory ${name}: ${inventory.requirements.length} requirements, ${inventory.claimCandidates.length} claim candidates; no acceptance verdict.\n`,
  );
  return name;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await inventoryCommand();
  } catch {
    process.stderr.write(
      "Program audit inventory failed: invalid, incomplete, changed, unsafe, or already recorded input/output.\n",
    );
    process.exitCode = 2;
  }
}
