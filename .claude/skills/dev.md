---
name: dev
description: MAGI development utilities - run dev server, build, lint, format
user_invocable: true
---

Development utility commands for MAGI.

## Usage
- `/dev` or `/dev start` - Start the dev server
- `/dev build` - Run a full build
- `/dev lint` - Run ESLint
- `/dev format` - Run Prettier
- `/dev check` - Run type checking only

## Steps

Based on the argument:

- **start**: Run `npm run dev` (starts Vite + Electron concurrently)
- **build**: Run `npm run build` and report success/failure
- **lint**: Run `npm run lint` and report issues
- **format**: Run `npm run format` to auto-format code
- **check**: Run `npx tsc -p tsconfig.main.json --noEmit` for type checking

If no argument, default to showing available commands.

## Notes
- Dev mode requires the Electron app window — it won't run headlessly
- Build creates packaged app in `release/` directory
- Always run type checking before committing
