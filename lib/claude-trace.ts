import type { ClaudeCallTrace } from "./types";

export type ClaudeCallRecorder = (
  label: string,
  system: string,
  user: string,
  response: string | null
) => void;

export function createClaudeCallRecorder(
  trace: ClaudeCallTrace[]
): ClaudeCallRecorder {
  return (label, system, user, response) => {
    trace.push({
      order: trace.length + 1,
      label,
      system,
      user,
      response: response ?? undefined,
    });
  };
}

export function prependClaudeTrace(
  trace: ClaudeCallTrace[],
  entry: ClaudeCallTrace
): ClaudeCallTrace[] {
  return [
    { ...entry, order: 1 },
    ...trace.map((item, index) => ({ ...item, order: index + 2 })),
  ];
}
