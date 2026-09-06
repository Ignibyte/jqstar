import type { Browser } from "@playwright/test";

export interface NavigationCandidate {
  id: string;
  host: string;
  version: string | null;
  javascript: boolean;
}

export interface NavigationFlow {
  id: string;
  status: "pass" | "fail" | "not-applicable";
  failure?: string | null;
  assertions: { key: string; passed: boolean }[];
  requests: object[];
  events: object[];
  disposal?: {
    failed: number;
    remaining: number;
    created: number;
    released: number;
    live: number;
  } | null;
}

export function runNavigationScenarios(
  browser: Browser,
  origin: string,
  candidate: NavigationCandidate,
  options?: {
    configuration?: "default" | "configured";
    subset?: string[];
    onFlow?: (flow: NavigationFlow) => void;
  },
): Promise<{
  candidate: string;
  configuration: string;
  browserVersion: string;
  flows: NavigationFlow[];
}>;
