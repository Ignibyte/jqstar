import manifest from "../package.json";

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseStarVersion(version: string): string {
  if (!stableVersion.test(version)) {
    throw new Error("The jQStar package version must be a stable major.minor.patch value.");
  }
  return version;
}

export const STAR_VERSION = parseStarVersion(manifest.version);
