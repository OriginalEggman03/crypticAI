/** Anthropic model IDs — see https://platform.claude.com/docs/en/about-claude/models */

/** Best quality for cryptic setting */
export const DEFAULT_SETTER_MODEL = "claude-opus-4-8";

export const DEFAULT_EXPLAIN_MODEL = "claude-opus-4-8";

export function setterModel(): string {
  return process.env.ANTHROPIC_SETTER_MODEL || DEFAULT_SETTER_MODEL;
}

export function explainModel(): string {
  return process.env.ANTHROPIC_EXPLAIN_MODEL || DEFAULT_EXPLAIN_MODEL;
}
