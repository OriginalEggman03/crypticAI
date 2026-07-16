export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.SENTRY_DSN?.trim()) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0.1,
      });
    }

    import("@/lib/db/homophones")
      .then(async ({ ensureHomophoneDatabase, getHomophoneStats }) => {
        await ensureHomophoneDatabase();
        const stats = getHomophoneStats();
        console.log(
          `Homophone database ready: ${stats.pairs} pairs, ${stats.words} words`
        );
      })
      .catch((err) => {
        console.error("Homophone database warm-up failed:", err);
      });
  }
}
