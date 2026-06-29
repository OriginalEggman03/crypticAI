# CrypticAI

Turn **Crossword Inspiration** into verified cryptic anagram clues. Letter math is checked in code; Claude Opus polishes prose and explains.

## Features

- Inspiration field with easy/hard difficulty
- **Claude Opus 4.8** for ranking, polishing, and surface explanation
- **Programmatic verification** before any clue is returned:
  - Anagram fodder, indicators, and letter rearrangement
  - Enumeration length and definition quality
  - Theme link, capitalization, contractions, and surface tightness
- User accounts with email verification, credits, and a searchable clue archive

## Quick start

```bash
npm install
copy .env.example .env.local
# Add ANTHROPIC_API_KEY, SESSION_SECRET, and Stripe keys as needed
npm run dev
```

## Deploy (Railway)

Production hosting guide: **[DEPLOY.md](./DEPLOY.md)** — volume for SQLite, env vars, custom domain, and Stripe webhooks.

## Environment

| Variable | Default |
|----------|---------|
| `ANTHROPIC_API_KEY` | required |
| `ANTHROPIC_SETTER_MODEL` | `claude-opus-4-8` |
| `ANTHROPIC_EXPLAIN_MODEL` | `claude-opus-4-8` |

## License

MIT
