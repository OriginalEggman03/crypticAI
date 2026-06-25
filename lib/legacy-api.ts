/** Legacy LLM routes disabled in production unless explicitly enabled. */
export function isLegacyApiDisabled(): boolean {
  if (process.env.ENABLE_LEGACY_API === "1") return false;
  return process.env.NODE_ENV === "production";
}
