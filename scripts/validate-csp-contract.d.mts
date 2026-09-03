export interface CspContractValidationResult {
  readonly accepted: number;
  readonly adversarial: number;
  readonly contexts: number;
  readonly denied: number;
  readonly digest: string;
  readonly grammarVersion: string;
  readonly publicOccurrences: number;
  readonly publicSources: number;
}

export function validateCspContract(repositoryRoot: string): Promise<CspContractValidationResult>;
