import { stat } from "node:fs/promises";

export async function verifyMobileReferenceUMD(path, expectedBytes) {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1) {
    throw new Error("Mobile reference UMD measurement must be a positive integer.");
  }
  const artifact = await stat(path);
  if (!artifact.isFile() || artifact.size !== expectedBytes) {
    throw new Error(
      `Mobile reference UMD is ${artifact.size} bytes; reviewed measurement is ${expectedBytes}.`,
    );
  }
  return artifact.size;
}
