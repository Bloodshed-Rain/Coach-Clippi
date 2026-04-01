---
name: stats
description: Query and display Melee player statistics from the MAGI database
user_invocable: true
---

Query and display the user's Melee stats from the MAGI database.

## Usage
- `/stats` - Show overall record, matchups, stages, and opponents (overview)
- `/stats opponents [search]` - Show opponent history, optionally filtered
- `/stats sets` - Show recent tournament-style sets
- `/stats analysis` - Show latest coaching analysis

## Steps

1. Parse the user's arguments
2. Run the appropriate stats CLI command: `npx tsx src/stats.ts [command] [args]`
   - Valid commands: `overview` (default), `opponents`, `sets`, `analysis`
3. Format the output nicely with tables and highlights
4. If the user asks about a specific matchup or character, filter appropriately

## Tips
- Highlight win rates above 60% as strengths, below 40% as areas to work on
- Compare current trends to overall averages when possible
- Use the melee-coach-analyst agent for interpreting what the stats mean in Melee context
