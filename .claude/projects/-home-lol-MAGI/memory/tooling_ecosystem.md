---
name: MAGI tooling ecosystem
description: MCP server, custom skills, hooks, and agents configured for the MAGI project as of 2026-03-28
type: project
---

## MCP Server
Custom MCP server at `src/mcp-server.ts` registered in `.mcp.json` as "magi".
12 tools: magi_get_stats, magi_get_matchups, magi_get_stages, magi_get_recent_games, magi_get_opponents, magi_get_coaching, magi_get_trends, magi_analyze_replay, magi_get_sets, magi_get_config, magi_db_query, magi_get_character_stats.

**Why:** Gives Claude direct read access to the MAGI SQLite database and replay analysis pipeline without needing CLI commands.

**How to apply:** Use MCP tools for data queries instead of running CLI scripts. The magi_db_query tool allows arbitrary SELECT queries for ad-hoc analysis.

## Skills (slash commands)
6 skills in `.claude/skills/`: /analyze, /stats, /import, /health, /coaching, /dev.

## Hooks
- PreCommit: TypeScript type-check before every commit
- Settings include broad Bash permissions for git, npm, gh, and filesystem operations

## Agents (pre-existing)
6 agents: electron-architect, llm-orchestrator, melee-coach-analyst, sentinel, slippi-analyst, ui-visionary
