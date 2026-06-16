/** Maximum Anthropic API calls per generate request (hard stop). */
export const MAX_LLM_CALLS = 14;

/** Maximum wall-clock time for generate request in milliseconds (hard stop). */
export const MAX_WALL_MS = 120_000;

/** Fixed repair pipeline — at most this many fix steps after the initial draft. */
export const MAX_FIX_STEPS = 5;

/** Full generation attempts per API request (each uses a fresh LLM budget). */
export const MAX_GENERATION_ATTEMPTS = 2;