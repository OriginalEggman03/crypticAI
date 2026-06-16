# CrypticAI

Turn personal **Crossword Inspiration** into a themed cryptic crossword. Claude Opus writes and edits clues; extensive code checks verify fairness before the grid is built.

## Features

- Single inspiration field and clue type selector
- **Claude Opus 4.8** for setting, editing, repair, and explain
- **Programmatic verification** before grid build:
  - Enumeration length
  - Answer not standalone in clue
  - Hidden / reverse-hidden letter checks + indicators
  - Anagram fodder, indicators, consecutive-word matching
  - Homophone indicators
  - Cryptic-definition question marks
  - Accurate `clueType` tags
- Explain Answer uses stored clue metadata

## Quick start

```bash
npm install
copy .env.example .env.local
# Add ANTHROPIC_API_KEY, SESSION_SECRET, and Stripe keys as needed
npm run dev
```

## Deploy (Railway)

Production hosting guide: **[DEPLOY.md](./DEPLOY.md)** — volume for SQLite, env vars, custom domain, and Stripe webhooks.

## Pipeline

1. Opus drafts clues with `clueType` + `anagramFodder`
2. Opus editor pass
3. Code verification (all checks above)
4. Opus repair pass (up to 3 rounds) for failures
5. Grid built locally

## Environment

| Variable | Default |
|----------|---------|
| `ANTHROPIC_API_KEY` | required |
| `ANTHROPIC_SETTER_MODEL` | `claude-opus-4-8` |
| `ANTHROPIC_CRITIC_MODEL` | `claude-opus-4-8` |
| `ANTHROPIC_REPAIR_MODEL` | `claude-opus-4-8` |
| `ANTHROPIC_EXPLAIN_MODEL` | `claude-opus-4-8` |

## License

MIT
