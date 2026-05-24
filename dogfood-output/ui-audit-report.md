# MAGI UI Audit Report

Audit date: 2026-05-17
Scope: Renderer UI across Dashboard, Sessions, Library, Trends, Characters, Practice, MAGI Oracle, Settings, plus source-level checks for accessibility/error-handling patterns.
Method: Ran the Vite renderer locally, used an Electron-preload mock harness to exercise data-backed UI states in browser, manually inspected routes with screenshots/DOM snapshots, checked console errors after route loads, reviewed relevant React/CSS source, and ran the test suite.

Note: The normal Vite browser entry cannot fully render data-backed pages because `window.clippi` is normally provided by Electron preload. A temporary local audit harness was used and then removed. No audit harness files remain in the working tree.

## Evidence screenshots

- Dashboard: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_b68add1ae2634f2995b9fdb5b4d52bbd.png
- Sessions: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_bee20d5746ae4b2b837595833aa6c1d1.png
- Library: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_f3a40009019b4bce9c74090c2874a6dd.png
- Trends: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_11630976c34a4003b2ff437fc5634c31.png
- Characters: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_4d188366c533412495908f9f423b1fd0.png
- Practice: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_82305c41853b42a3a6388a7e4b47684c.png
- Oracle empty state: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_7864227cf26b496481021c6f44ef5097.png
- Oracle conversation: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_5bc917f5957a4d1085205555c7ba0246.png
- Settings top: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_87e1f978963f4b2bb9d235dc33d2592c.png
- Settings AI provider area: C:\Users\MC\AppData\Local\hermes\cache\screenshots\browser_screenshot_3cebfaaf434e4fff919c3982b5487b54.png

## Executive summary

The UI is visually cohesive and polished: the dark sci-fi theme, sidebar shell, cards, metrics, and route-level information architecture are strong. The app feels like a real product rather than a basic CRUD interface.

The biggest issues are not broad visual breakage, but repeated UX/accessibility defects:

1. Floating Tweaks gear overlaps content on analytic pages, especially charts/tables.
2. Many secondary labels are low contrast and very small.
3. Several controls rely on subtle selected states and color-only meaning.
4. Dense tables/cards truncate important game/opponent data without visible expansion affordances.
5. Charts are attractive but lack axis labels, data summaries, and accessible alternatives.
6. Settings is long and dense; critical AI provider settings are buried below the fold without section navigation.
7. Multiple data-backed pages assume exact response shapes and can expose raw runtime failures if preload/API data is absent or malformed.
8. Normal browser/Vite mode gets stuck on loading because `window.clippi` is missing, with no clear compatibility fallback.

## Prioritized findings

### High severity

#### H1. Normal Vite browser render can get stuck on Loading without Electron preload
Where: http://localhost:5173/#/dashboard via normal browser entry
Evidence: Dashboard showed only `LOADING...` indefinitely with no console errors.
Impact: Developer QA in browser is misleading; users who hit renderer without preload get a broken loading state rather than a clear unsupported-environment message.
Recommendation:
- Add a preload availability check near app startup.
- If `window.clippi` is unavailable, show a controlled error state: “MAGI must run inside Electron.”
- Consider a first-class mock/dev mode for browser QA.

#### H2. Floating Tweaks gear overlaps important content
Where: Dashboard, Trends, Library/Settings lower content risk
Evidence: On Trends, the bottom-right gear visually overlaps/competes with the latest chart area. On Dashboard it crowds the Recent Games `View all` area.
Impact: Obscures high-value data and can block interactions/tooltips near the lower-right.
Recommendation:
- Reserve bottom/right padding in `.main-content` equal to the FAB footprint.
- Or move Tweaks into the sidebar/header.
- Hide/minimize FAB on dense analytical pages or when scrolled near actionable controls.

#### H3. Charts lack axis labels and accessible summaries
Where: Dashboard sparklines, Trends hero chart/mini charts
Impact: Users can see direction but not scale, time range, exact values, or what screen readers should announce.
Recommendation:
- Add lightweight x/y labels for Trends.
- Add tooltip/hover values and a text summary: e.g. “Neutral WR 34.8%, down 10.0pp over 20 games.”
- Provide an accessible table/summary fallback for chart data.

#### H4. Settings page is too long without section navigation; AI provider settings are buried
Where: Settings
Impact: Critical setup for AI features may be hard to discover. Users may not know to scroll through Player/Replay/Dolphin sections to find provider configuration.
Recommendation:
- Add settings tabs or a sticky mini-nav: Player, Replays, Dolphin, AI Provider, Advanced.
- Surface AI provider status near the top if Oracle/coaching depends on it.
- Add a “Test connection” action for configured providers.

#### H5. Data shape fragility can crash pages instead of showing controlled fallback
Where: Sessions, Practice, Oracle, Settings under mocked/malformed preload responses; source patterns in pages call `.map()`/`.toFixed()` directly on expected fields.
Impact: Any IPC mismatch, migration edge case, or missing field can take out an entire route.
Recommendation:
- Add runtime normalization at the preload/query boundary.
- Use safe defaults for arrays/numeric metrics.
- Add route-local error and empty states before rendering lists/charts.
- Hide raw technical errors behind “Details” in production.

### Medium severity

#### M1. Low contrast / small secondary typography across the app
Where: Sidebar labels/status, page subtitles, KPI labels, card labels, table headers, helper text, input placeholders.
Impact: The aesthetic is strong but readability suffers; likely WCAG failures for normal-size text.
Recommendation:
- Increase contrast for `--text-muted`/`--text-secondary` where used for functional labels.
- Avoid ultra-small uppercase letter-spaced labels for required form/data labels.
- Run automated contrast checks on liquid theme tokens.

#### M2. Selected states are subtle on pills/radios/chips
Where: Trends range/metric/opponent pills, Library result chips, AI provider radio cards, Tweaks chips.
Impact: Users may not know which filter/provider is active.
Recommendation:
- Use stronger active fill/border and optional checkmark/ACTIVE badge.
- Add `aria-pressed`/`aria-selected`/radio semantics where appropriate.

#### M3. Color-only signals for win/loss/status
Where: Result dots, win/loss deltas, watcher active dot, winrate color.
Impact: Colorblind/screen-reader users lose meaning.
Recommendation:
- Add labels/tooltips/aria-labels: “Win”, “Loss”, “Watcher active”.
- For result dot strips, expose an accessible sequence summary.
- Use icons/shapes/text in addition to color.

#### M4. Dense tables truncate important data without expansion affordance
Where: Library, Dashboard Recent Games, Sessions opponent lists.
Impact: Opponent tags, stages, and matchups are truncated; users cannot confirm exact records at a glance.
Recommendation:
- Add `title`/tooltip for truncated cells.
- Consider row detail expansion or responsive column priority.
- Add sticky headers / sort affordances if sorting is supported.

#### M5. Repeated “Session Report” buttons are ambiguous for screen readers
Where: Sessions cards
Impact: Multiple identical buttons become hard to distinguish in assistive tech.
Recommendation:
- Add contextual accessible names: “View session report for Fri, May 1”.
- Consider shorter visible label “View report”.

#### M6. Watcher state is inconsistent/unclear
Where: Sidebar always shows WATCHER ACTIVE / 0 GAMES; Settings button says “Watch for New Games”.
Impact: Users cannot tell whether watcher is running, idle, or just enabled.
Recommendation:
- Make watcher status stateful and explicit: “Watching · no active games” vs “Watcher stopped”.
- Settings button should switch to “Stop watching” when active.
- App shell should use real watcher/game count state, not a hardcoded shell value.

#### M7. Oracle empty state and chat are functional but under-explain constraints
Where: MAGI Oracle
Impact: If no games are imported/watched, users may expect personalized answers that cannot be produced.
Recommendation:
- Include “Ask about recent games, matchups, habits, or improvement patterns.”
- If no data is available, add “Import games first for personalized answers.”
- Add accessible labels for conversation region and input.

#### M8. Practice empty state is clear but does not explain prerequisites
Where: Practice
Impact: Users may generate a plan before enough data exists, or not understand what weaknesses are analyzed.
Recommendation:
- Explain source data: recent sessions, matchup trends, execution metrics.
- If insufficient data, route to Import Settings first.
- When generating, show progress and a controlled error if AI/config is missing.

#### M9. Destructive actions need stronger UX affordances
Where: Settings `Clear All Games`, Command Palette clear action, Oracle clear history.
Impact: Native confirm is functional but inconsistent and not branded; destructive actions may be too close to normal settings actions.
Recommendation:
- Use a branded confirmation modal with explicit affected data and required confirmation text for “clear all games”.
- Separate destructive actions into an Advanced/Danger Zone section.

### Low severity / polish

#### L1. “1 games” grammar bug
Where: Sessions DayCard text uses `{day.games} games` unconditionally.
Recommendation: pluralize `game`/`games`.

#### L2. Oracle speaker separation could be stronger
Where: Oracle message layout.
Recommendation: Give user/assistant messages more distinct backgrounds/alignment or labels.

#### L3. Character cards need clearer click affordance
Where: Characters grid.
Recommendation: Add “View details” hover/focus affordance and accessible card labels.

#### L4. Character page could use filters/sorting
Where: Characters grid.
Recommendation: Add played/unplayed filter and sort by games/winrate once data exists.

#### L5. Settings API key/model controls need clearer behavior
Where: AI Provider section.
Recommendation:
- Clarify “Custom ID” as a button/toggle.
- Add provider connection test.
- Mask saved keys and show storage/privacy helper text.
- Use stronger active provider card highlight.

## Route notes

### Dashboard
Strengths: Strong KPI hierarchy, good page title, useful Oracle insight, attractive Recent Form visuals.
Issues: FAB crowds Recent Games, color-only dots, chart/sparkline clarity, low contrast secondary labels.

### Sessions
Strengths: Cards are visually consistent and compact; date grouping is clear.
Issues: Long opponent strings risk overflow/truncation, repeated generic buttons, grammar “1 games”, color-only dots, no unique aria labels for report actions.

### Library
Strengths: Good summary metrics, filter panel is understandable, table is dense but useful.
Issues: Aggressive truncation, no reset filters, subtle active filter state, colored dot first column has no visible label, row clickability could be clearer.

### Trends
Strengths: Clear filter groups, chart renders nicely with valid numeric series, metric tabs are understandable.
Issues: Missing axes/labels, no chart accessibility summary, active states are subtle, FAB overlaps chart, chips may overflow at narrower widths.

### Characters
Strengths: Attractive visual grid, active nav state clear, empty per-character state is understandable.
Issues: Low-contrast artwork/secondary text, unclear progress bars, click affordance not obvious, no filtering/sorting.

### Practice
Strengths: Good first-use empty state and clear CTAs.
Issues: Does not explain data prerequisites/source; generation errors display as raw text; no visible plan example or preview.

### MAGI Oracle
Strengths: Clean empty state, useful prompt examples, conventional input row, chat layout works for short exchanges.
Issues: Empty input Ask button appears enabled, helper/placeholder contrast low, no visible history export/copy/regenerate, speaker labels rely on initials.

### Settings
Strengths: Logical groupings, clear path fields, provider cards are consistent.
Issues: Long page without section nav, labels small/low-contrast, watcher state unclear, provider active state subtle, destructive action placement, no connection test.

## Source-level observations

- `LiquidShell` uses `aria-current` and `aria-label` for nav items: good.
- `TweaksPanel` has an aria-label on the floating button: good, but its visual placement causes overlap.
- `Pill` currently renders plain buttons with active CSS only. Add `aria-pressed={active}` or more specific radio/tab semantics in each context.
- Many inputs visually have labels, but verify programmatic label association; some labels wrap input, others may not have `htmlFor`.
- Several CSS rules set `outline: none` on inputs/selects. Some replace it with border/box-shadow, but this needs keyboard audit because focus indication may be weak or inconsistent.
- `.main-content` is the scroll container, not `window`; automated scroll/testing needs to target it directly. Floating controls should account for this.

## Test/build notes

- `npm install` completed successfully; audit did not intentionally modify dependencies.
- `npm test` ran and failed 10 tests because `C:\Users\MC\Desktop\MAGI\test-replays` is missing. Non-replay-dependent tests passed: config, db, libraryFilter, themes, stores, sparkline. This appears to be an environment/data-fixture issue rather than a UI regression.

## Recommended implementation order

1. Add preload/dev fallback handling and route-local error states.
2. Move/offset the floating Tweaks gear.
3. Improve contrast tokens and focus states for liquid theme.
4. Add ARIA selected/pressed states and stronger visual active states for pills/chips/radios.
5. Add accessible labels/tooltips for result dots, truncated table cells, and session report buttons.
6. Improve Trends chart labels, summaries, and empty/insufficient-data states.
7. Refactor Settings into sections/tabs and improve AI provider validation/testing.
8. Polish route-specific copy: Sessions pluralization, Practice prerequisites, Oracle data constraints.
