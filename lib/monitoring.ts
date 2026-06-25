type ErrorContext = Record<string, unknown>;

let sentryReady = false;

async function initSentry(): Promise<void> {
  if (sentryReady || !process.env.SENTRY_DSN?.trim()) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
    sentryReady = true;
  } catch {
    // Optional dependency — app runs without Sentry.
  }
}

export async function captureServerError(
  error: unknown,
  context?: ErrorContext
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[error]", message, context ?? {});

  if (!process.env.SENTRY_DSN?.trim()) return;

  await initSentry();
  if (!sentryReady) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, { extra: context });
}
