---
name: coaching
description: Generate AI coaching feedback for recent Melee games using the configured LLM
user_invocable: true
---

Generate AI-powered coaching feedback for the user's Melee games.

## Usage
- `/coaching` - Coach on the most recent game
- `/coaching <N>` - Coach on the last N games as a set
- `/coaching <file.slp>` - Coach on a specific replay file

## Steps

1. Parse arguments to determine what to coach on
2. For recent games: `npx tsx src/pipeline-cli.ts --dir <replay-folder> --sets` to find sets
3. For specific files: `npx tsx src/pipeline-cli.ts <files...> --target <player>`
4. Without `--json`, the CLI will call the configured LLM and output coaching text
5. Present the coaching feedback with clear formatting
6. Offer follow-up analysis on specific areas mentioned in the coaching

## Notes
- Requires a configured LLM (check with `/health`)
- Uses the model configured in `~/.magi-melee/config.json`
- Coaching is cached in the database — won't re-call LLM for same replay
- Use the melee-coach-analyst agent to validate coaching accuracy
