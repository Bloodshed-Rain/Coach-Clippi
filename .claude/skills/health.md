---
name: health
description: Run health checks on the MAGI application - TypeScript, tests, database, and LLM connectivity
user_invocable: true
---

Run comprehensive health checks on the MAGI application.

## Steps

Run ALL of these checks and report results:

### 1. TypeScript Compilation
```bash
npx tsc -p tsconfig.main.json --noEmit 2>&1
```

### 2. Vite Build Check
```bash
npx vite build 2>&1 | tail -5
```

### 3. Test Suite
```bash
npm test 2>&1
```

### 4. Database Health
```bash
node -e "const db = require('./dist/main/db.js'); console.log('Games:', db.getTotalGames()); console.log('Record:', JSON.stringify(db.getOverallRecord())); db.closeDb();"
```

### 5. Configuration
```bash
node -e "const c = require('./dist/main/config.js'); const cfg = c.loadConfig(); console.log('Target:', cfg.targetPlayer); console.log('Replay folder:', cfg.replayFolder); console.log('LLM model:', cfg.llmModelId); console.log('Has API keys:', { openrouter: !!cfg.openrouterApiKey, gemini: !!cfg.geminiApiKey, anthropic: !!cfg.anthropicApiKey, openai: !!cfg.openaiApiKey });"
```

## Report Format
Present results as a clear health report:
- Use PASS/FAIL for each check
- Highlight any issues that need attention
- Suggest fixes for any failures
- Use the sentinel agent for deeper investigation if TypeScript or tests fail
