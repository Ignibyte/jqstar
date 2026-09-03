import type { StarFlushDiagnostic } from "./types";

export class StarFlushError extends Error {
  override readonly name = "StarFlushError";
  readonly diagnostic: StarFlushDiagnostic;

  constructor(diagnostic: StarFlushDiagnostic) {
    super(
      `jQStar testing work did not settle after ${diagnostic.rounds} rounds and ${diagnostic.elapsedMs} ms.`,
    );
    this.diagnostic = diagnostic;
  }
}

export interface StarConformanceFailure {
  readonly case: string;
  readonly error: {
    readonly message: string;
    readonly name: string;
  };
}

export class StarConformanceError extends AggregateError {
  override readonly name = "StarConformanceError";
  readonly failures: readonly StarConformanceFailure[];

  constructor(errors: readonly unknown[], failures: readonly StarConformanceFailure[]) {
    const summary = failures
      .map((failure) => `${failure.case}: ${failure.error.message}`)
      .join("; ")
      .slice(0, 2_000);
    super(
      errors,
      `jQStar conformance failed in ${failures.length} case${failures.length === 1 ? "" : "s"}: ${summary}`,
    );
    this.failures = Object.freeze(failures.map((failure) => Object.freeze(failure)));
  }
}

export class StarResponseError extends Error {
  override readonly name = "StarResponseError";
}
