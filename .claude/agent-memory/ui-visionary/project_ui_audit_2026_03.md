---
name: UI Audit Findings - March 2026
description: Deep UI audit of MAGI renderer — design system, component architecture, per-page analysis, performance, accessibility, and prioritized improvements
type: project
---

## Architecture Overview

- **Stack**: React 19 + Vite renderer, framer-motion 12, recharts 3, react-markdown 10
- **Dependencies installed but unused**: react-router-dom 7 (navigation is state-based in App.tsx)
- **File structure**: 6 pages, components (ErrorBoundary, NavIcons, RadarChart, StockTimeline, CommandPalette, Onboarding), 1 shared utility (radarStats.ts), 1 hooks file
- **Total renderer code**: ~2800 LOC across TSX files + ~2070 LOC CSS

## Design System (Post-Rewrite March 28 2026)

### Tokens & Theming
- **Fonts**: DM Sans (sans/display), JetBrains Mono (mono). Loaded via Google Fonts CDN in CSS @import.
- **Theme**: Two modes (dark/light). CSS custom properties set imperatively via `applyTheme()` in themes.ts. The `:root` block in CSS provides dark-mode fallbacks for initial paint.
- **Visual language**: Cool blue-charcoal base (#171c21). Spring Green (#18FF6D) used as surgical accent for wins, active states, primary CTAs. Cards (#1e2529) pop from background with real box-shadows. Borders are neutral white-alpha, never green-tinted.
- **Design direction**: Bloomberg Terminal meets F1 telemetry — professional esports analytics platform.

### CSS Structure (styles.css)
Clean sectioned layout: Fonts > Root variables > Reset > Body > Layout > Page headers > Cards > Stat boxes > Tables > Buttons > Tabs > Game cards > MAGI coaching card > Analysis text > Stock timeline > Timestamp links > Settings forms > Characters page > Profile page > Trends page > Sessions page > Command palette > Loading/empty states > Scrollbar > Animations > Accessibility.

**Why:** Complete CSS rewrite on 2026-03-28 eliminated all legacy cruft ("holographic", "plasma", "tactical HUD" comments and dead code). Every class name in the file is actively referenced by TSX components.

**How to apply:** When modifying UI, check styles.css sectioned comments to find the right location for new styles. All theme tokens flow from themes.ts. The CSS `:root` block is fallback only — themes.ts is the source of truth for token values.
