---
name: analyze
description: Analyze Melee replay files (.slp) through the MAGI pipeline and optionally generate AI coaching
user_invocable: true
---

Analyze one or more Melee replay (.slp) files using the MAGI pipeline.

## Usage
- `/analyze <file.slp>` - Analyze a single replay
- `/analyze <folder>` - Analyze all replays in a folder
- `/analyze --recent <N>` - Analyze N most recent games from the database

## Steps

1. Parse the user's arguments to determine what to analyze
2. For a single file: Run `npx tsx src/pipeline-cli.ts <file> --json` to get structured game data
3. For a folder: Run `npx tsx src/pipeline-cli.ts --dir <folder> --sets` to list sets, then analyze
4. For recent games: Query the database using the magi MCP server tools if available, otherwise run the CLI
5. Present the parsed data in a clear, organized format
6. Offer to generate coaching feedback by running with the LLM (without --json flag)
7. Use the melee-coach-analyst agent for domain-specific interpretation if the data reveals interesting patterns

## Important
- The `--target` flag specifies which player's perspective to analyze from
- Check `~/.magi-melee/config.json` for the user's configured target player if not specified
- Use `--json` flag to get structured data for programmatic analysis
- Without `--json`, the CLI calls the configured LLM for coaching text
