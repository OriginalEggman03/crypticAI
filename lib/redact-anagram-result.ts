import { isAdminUser } from "@/lib/admin";
import type { AnagramClueResult } from "@/lib/types";

/** Remove Claude prompts/trace from API responses for non-admin viewers. */
export function redactAnagramResultForViewer(
  result: AnagramClueResult,
  viewer: { email: string }
): AnagramClueResult {
  if (isAdminUser(viewer)) return result;

  const { claudeTrace: _trace, prompts: _prompts, ...publicResult } = result;
  return publicResult;
}
