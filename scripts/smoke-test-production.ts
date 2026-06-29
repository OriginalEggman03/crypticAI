/**
 * Production smoke test for https://www.crypticai.uk (or SMOKE_TEST_URL).
 *
 * Public checks (no secrets):
 *   npm run smoke:prod
 *
 * Authenticated checks (existing verified account):
 *   SMOKE_TEST_EMAIL=you@example.com SMOKE_TEST_PASSWORD=secret npm run smoke:prod
 *
 * Full generation (slow, ~1–3 min, uses a free spin):
 *   SMOKE_TEST_GENERATE=1 SMOKE_TEST_EMAIL=... SMOKE_TEST_PASSWORD=... npm run smoke:prod
 */

const BASE_URL = (
  process.env.SMOKE_TEST_URL ||
  process.env.APP_URL ||
  "https://www.crypticai.uk"
).replace(/\/$/, "");

const AUTH_EMAIL = process.env.SMOKE_TEST_EMAIL?.trim();
const AUTH_PASSWORD = process.env.SMOKE_TEST_PASSWORD ?? "";
const RUN_GENERATE = process.env.SMOKE_TEST_GENERATE === "1";

const TIMEOUT_MS = Number(process.env.SMOKE_TEST_TIMEOUT_MS ?? 30_000);
const GENERATE_TIMEOUT_MS = Number(
  process.env.SMOKE_TEST_GENERATE_TIMEOUT_MS ?? 200_000
);

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
  skipped?: boolean;
}

function fail(message: string): never {
  throw new Error(message);
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function sessionCookieFromResponse(response: Response): string | null {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  if (cookies.length === 0) {
    const single = response.headers.get("set-cookie");
    if (single) cookies.push(single);
  }

  for (const header of cookies) {
    const match = header.match(/crypticai_session=([^;]+)/);
    if (match) return `crypticai_session=${match[1]}`;
  }

  return null;
}

async function runCheck(
  name: string,
  fn: () => Promise<void>
): Promise<CheckResult> {
  try {
    await fn();
    return { name, ok: true };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function skip(name: string, reason: string): CheckResult {
  return { name, ok: true, skipped: true, detail: reason };
}

async function publicChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push(
    await runCheck("GET /api/health", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
      if (!res.ok) fail(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        ok?: boolean;
        checks?: { database?: { ok?: boolean }; env?: { ok?: boolean } };
      };
      if (!body.ok) fail(JSON.stringify(body));
      if (!body.checks?.database?.ok) fail("database check failed");
      if (!body.checks?.env?.ok) fail("env check failed");
    })
  );

  for (const path of ["/", "/about", "/terms", "/privacy", "/robots.txt", "/sitemap.xml"]) {
    results.push(
      await runCheck(`GET ${path}`, async () => {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`);
        if (!res.ok) fail(`HTTP ${res.status}`);
      })
    );
  }

  results.push(
    await runCheck("POST /api/archive requires auth (401)", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: 5,
          answer: "TEST",
          clue: "Smoke test clue (4)",
          inspiration: "smoke test",
          difficulty: "easy",
          anagramFodder: "test",
        }),
      });
      if (res.status !== 401) fail(`expected 401, got ${res.status}`);
    })
  );

  results.push(
    await runCheck("GET /api/archive search", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/archive?limit=1`);
      if (!res.ok) fail(`HTTP ${res.status}`);
      const body = (await res.json()) as { results?: unknown[] };
      if (!Array.isArray(body.results)) fail("missing results array");
    })
  );

  results.push(
    await runCheck("POST /api/auth/login rejects bad password (401)", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "smoke-invalid@example.com",
          password: "not-a-real-password",
        }),
      });
      if (res.status !== 401) fail(`expected 401, got ${res.status}`);
    })
  );

  return results;
}

async function authenticatedChecks(): Promise<CheckResult[]> {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    return [
      skip(
        "authenticated checks",
        "set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD to run"
      ),
    ];
  }

  const results: CheckResult[] = [];
  let sessionCookie: string | null = null;

  results.push(
    await runCheck("POST /api/auth/login", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: AUTH_EMAIL,
          password: AUTH_PASSWORD,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        fail(`HTTP ${res.status}: ${body}`);
      }
      sessionCookie = sessionCookieFromResponse(res);
      if (!sessionCookie) fail("no session cookie returned");
    })
  );

  if (!sessionCookie) return results;

  const cookie = sessionCookie;

  results.push(
    await runCheck("GET /api/auth/me", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      if (!res.ok) fail(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        user?: { email?: string };
        credits?: { canGenerate?: boolean };
      };
      if (body.user?.email?.toLowerCase() !== AUTH_EMAIL.toLowerCase()) {
        fail(`unexpected user: ${body.user?.email}`);
      }
      if (!body.credits || typeof body.credits.canGenerate !== "boolean") {
        fail("missing credits status");
      }
    })
  );

  results.push(
    await runCheck("GET /api/archive/inspirations", async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/archive/inspirations`, {
        headers: { Cookie: cookie },
      });
      if (!res.ok) fail(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        recent?: unknown[];
        suggestions?: unknown[];
      };
      if (!Array.isArray(body.suggestions) && !Array.isArray(body.recent)) {
        fail("missing inspirations data");
      }
    })
  );

  if (RUN_GENERATE) {
    results.push(
      await runCheck("POST /api/anagram generate", async () => {
        const res = await fetchWithTimeout(
          `${BASE_URL}/api/anagram`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
            },
            body: JSON.stringify({
              request: {
                inspiration: "British birds",
                difficulty: "easy",
              },
            }),
          },
          GENERATE_TIMEOUT_MS
        );
        if (res.status === 402) {
          fail("no credits remaining — use an account with free spins");
        }
        if (!res.ok) {
          const body = await res.text();
          fail(`HTTP ${res.status}: ${body.slice(0, 300)}`);
        }
        const body = (await res.json()) as {
          result?: { clue?: { answer?: string; clue?: string } };
        };
        if (!body.result?.clue?.answer || !body.result?.clue?.clue) {
          fail("missing clue in response");
        }
      })
    );
  } else {
    results.push(
      skip(
        "POST /api/anagram generate",
        "set SMOKE_TEST_GENERATE=1 to run (uses a credit, ~1–3 min)"
      )
    );
  }

  return results;
}

function printResults(results: CheckResult[]): void {
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.skipped) {
      skipped++;
      console.log(`○ ${result.name} — skipped (${result.detail})`);
      continue;
    }
    if (result.ok) {
      console.log(`✓ ${result.name}`);
    } else {
      failed++;
      console.log(`✗ ${result.name} — ${result.detail}`);
    }
  }

  console.log("");
  console.log(
    `Smoke test @ ${BASE_URL}: ${results.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped`
  );

  if (failed > 0) process.exit(1);
}

async function main(): Promise<void> {
  console.log(`Running smoke tests against ${BASE_URL}\n`);

  const results = [
    ...(await publicChecks()),
    ...(await authenticatedChecks()),
  ];

  printResults(results);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
