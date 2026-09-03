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

function bounded(value: string, maximum: number): string {
  return value.length <= maximum ? value : value.slice(0, maximum);
}

function normalizedError(error: unknown): Readonly<{ message: string; name: string }> {
  if (error instanceof Error) {
    let name = "Error";
    let message = "Cleanup failed.";
    try {
      if (typeof error.name === "string" && error.name) name = error.name;
    } catch {
      // A hostile error accessor cannot escape the disposal report boundary.
    }
    try {
      if (typeof error.message === "string" && error.message) message = error.message;
    } catch {
      // A hostile error accessor cannot escape the disposal report boundary.
    }
    return Object.freeze({ name: bounded(name, 120), message: bounded(message, 1_024) });
  }
  return Object.freeze({
    name: "ThrownValue",
    message: bounded(String(error), 1_024),
  });
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
