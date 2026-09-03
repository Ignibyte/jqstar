export function throwCollectedErrors(errors: readonly unknown[], message: string): void {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, message);
}

export function attempt(errors: unknown[], callback: () => void): void {
  try {
    callback();
  } catch (error) {
    errors.push(error);
  }
}
