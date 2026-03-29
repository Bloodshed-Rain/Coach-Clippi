---
name: import
description: Import Melee replay files into the MAGI database
user_invocable: true
---

Import .slp replay files into the MAGI database for tracking and analysis.

## Usage
- `/import <folder>` - Import all replays from a folder
- `/import <file.slp>` - Import a single replay

## Steps

1. Parse the user's arguments for the path
2. Verify the path exists using `ls`
3. Run: `npx tsx src/import-cli.ts <path> [--target <player>]`
4. Report the results: how many imported, skipped (duplicates), errors
5. Suggest running `/stats` or `/analyze` after import

## Notes
- Replays are deduplicated by SHA-256 hash — re-importing is safe
- The target player is auto-detected from config if not specified
- Large folders may take time; the CLI shows progress
