---
name: stats
description: Query and display Melee player statistics from the MAGI database
user_invocable: true
---

Query and display the user's Melee stats from the MAGI database.

## Usage
- `/stats` - Show overall record, matchups, stages, and trends
- `/stats opponents [search]` - Show opponent history, optionally filtered
- `/stats sets` - Show recent tournament-style sets
- `/stats coaching` - Show latest coaching analysis
- `/stats trends <stat>` - Show trend for a specific stat

## Steps

1. Parse the user's arguments
2. Run the appropriate stats CLI command: `npx tsx src/stats.ts [command] [args]`
3. Format the output nicely with tables and highlights
4. For trend data, identify notable patterns (improving, declining, plateauing)
5. If the user asks about a specific matchup or character, filter appropriately

## Available stats for trends
neutral_win_rate, conversion_rate, l_cancel_rate, recovery_success_rate, ledge_entropy, knockdown_entropy, power_shield_count, edgeguard_success_rate, wavedash_count, avg_damage_per_opening

## Tips
- Highlight win rates above 60% as strengths, below 40% as areas to work on
- Compare current trends to overall averages when possible
- Use the melee-coach-analyst agent for interpreting what the stats mean in Melee context
