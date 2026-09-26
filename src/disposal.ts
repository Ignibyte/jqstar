import { errorFields } from "./value-checks";

export type StarDisposalCategory =
  | "application"
  | "effect"
  | "hook"
  | "listener"
  | "observer"
  | "plugin"
  | "request"
  | "service"
  | "subscription"
  | "task";

export interface StarDisposalResource {
  readonly category: StarDisposalCategory;
  readonly owner: string;
}

export interface StarDisposalFailure extends StarDisposalResource {
  readonly error: {
    readonly message: string;
    readonly name: string;
  };
}

export interface StarDisposalReport {
  readonly schema: "jquery-star-disposal/1";
  readonly attempted: readonly StarDisposalResource[];
  readonly released: readonly StarDisposalResource[];
  readonly failed: readonly StarDisposalFailure[];
  readonly remaining: readonly StarDisposalResource[];
}

export interface StarDisposalReportController {
  readonly report: StarDisposalReport;
  attempt(resource: StarDisposalResource): void;
  fail(resource: StarDisposalResource, error: unknown): void;
  release(resource: StarDisposalResource): void;
  remain(resource: StarDisposalResource): void;
}

function normalizedError(error: unknown): Readonly<{ message: string; name: string }> {
  const { name, message } = errorFields(error, "Cleanup failed.", String, false);
  return Object.freeze({ name: name.slice(0, 120), message: message.slice(0, 1_024) });
}

function snapshot<Resource extends StarDisposalResource>(
  resources: readonly Resource[],
): readonly Readonly<Resource>[] {
  return Object.freeze(resources.map((resource) => Object.freeze({ ...resource })));
}

export function createStarDisposalReport(): StarDisposalReportController {
  const attempted: StarDisposalResource[] = [];
  const released: StarDisposalResource[] = [];
  const failed: StarDisposalFailure[] = [];
  const remaining: StarDisposalResource[] = [];
  const report = Object.freeze<StarDisposalReport>({
    schema: "jquery-star-disposal/1",
    get attempted() {
      return snapshot(attempted);
    },
    get released() {
      return snapshot(released);
    },
    get failed() {
      return snapshot(failed);
    },
    get remaining() {
      return snapshot(remaining);
    },
  });
  return {
    report,
    attempt: (resource) => attempted.push(resource),
    release: (resource) => released.push(resource),
    fail: (resource, error) => failed.push({ ...resource, error: normalizedError(error) }),
    remain: (resource) => remaining.push(resource),
  };
}

export class StarDisposalError extends AggregateError {
  override readonly name = "StarDisposalError";
  readonly report: StarDisposalReport;

  constructor(errors: readonly unknown[], report: StarDisposalReport) {
    super(errors, "jQuery Star kernel disposal failed.");
    this.report = report;
  }
}
