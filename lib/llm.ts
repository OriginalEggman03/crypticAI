interface AnthropicJsonOptions {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  /** Per-call timeout — avoids hung requests that surface as browser "Failed to fetch". */
  timeoutMs?: number;
}

export async function anthropicChatJson({
  apiKey,
  model,
  system,
  user,
  maxTokens = 8192,
  timeoutMs = 45_000,
}: AnthropicJsonOptions): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Anthropic request timed out after ${Math.round(timeoutMs / 1000)}s`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic request failed: ${errText.slice(0, 400)}`);
  }

  const completion = await res.json();
  const block = completion.content?.[0];
  if (block?.type !== "text" || !block.text) {
    throw new Error("Empty response from Anthropic");
  }

  return block.text;
}

/** Extract the first complete `{...}` object, ignoring trailing commentary. */
function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) {
    throw new Error("Could not parse JSON from model response");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("Could not parse JSON from model response (unclosed object)");
}

export function parseModelJson<T>(text: string): T {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonText = extractFirstJsonObject(cleaned);

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error("Could not parse JSON from model response");
  }
}
