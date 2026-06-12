# MAGI — Full UI/UX Audit

_Generated 2026-06-06 · 113 ranked findings across 16 review dimensions (9 pages + 7 cross-cutting concerns), each screenshot- and code-grounded, then verified for grounding/already-done/specificity and deduped._

**Severity spread:** 🟠 High 26 · 🟡 Medium 55 · 🔵 Low 29 · ⚪ Nit 3

**Effort split:** 75 quick-wins (localized CSS/token/single-file) · 38 structural (multi-file / new components / data-shape).

---

## Executive overview

MAGI is a genuinely polished, opinionated desktop app: a coherent dark "liquid glass" aesthetic, a consistent component vocabulary (Card/KPI/Badge/Pill/ResultDot), a real design-token layer, framer-motion micro-interactions, and thoughtful coaching surfaces (collapsible CoachingCards, timestamp jump-to-moment, embedded Dolphin playback). The strengths are real and the happy-path screenshots read well. The systemic problems are four: (1) the lowest text tier (--text-muted #6a707b in the shipped liquid theme, #64748b in telemetry/fallback) fails WCAG AA almost everywhere it is used — card titles, stat/KPI labels, dates, placeholders, drill instructions — so the smallest, most context-critical text is the hardest to read; (2) outcome and "good/bad" judgments are encoded by color alone (win/loss dots, colored stat values) with no shape/icon/text fallback and frequently no accessible name; (3) keyboard accessibility is half-built — focus-visible rings exist on some controls (.btn/.tab/.nav-item) but are missing on many interactive elements (table rows, pills, coaching toggles, timestamp links, stock-timeline segments), and prefers-reduced-motion is ignored by every framer-motion animation; (4) the design system contradicts itself — duplicate .data-table/.winrate-bar rule blocks silently override intended styling, the entire --space-* scale and a dozen tokens are dead, and JS motion bypasses the ease/spring tokens. Layered on top are several real task-flow bugs: "Import Replays" navigates to Settings instead of importing, Sessions' dot row inflates losses for non-win games, saving Settings can silently revert the Tweaks-chosen theme, and the auto-scaling Trends hero chart can make a 1pp wiggle look like a 30pp collapse.

---

## Cross-cutting themes

These are the systemic patterns the per-page findings roll up into — fix the theme and many individual findings collapse at once.

### 1. Low-contrast muted text fails WCAG AA system-wide  `HIGH`

--text-muted is the app's default small-text color (liquid #6a707b runtime, telemetry/fallback #64748b, light #94a3b8) and it fails the 4.5:1 AA threshold for normal/small text on essentially every surface: ~3.0-3.9:1 in dark themes and 2.3-2.6:1 in light. It is used 66+ times in CSS plus inline, and crucially on the smallest, most label-like text — card titles (9px), KPI/stat-group labels (10px), page-header subtitles (10px), table dates (11px), drill instructions (11px), and input placeholders. --text-dim is not a safe escape hatch in liquid because applyTheme aliases it to textSecondary at runtime (themes.ts:414), so the only reliable fix is --text-secondary or raising the token. Each instance has a precise file:line and its own correct fix; the shared root cause is this theme.

_Touches:_ Design system & tokens, Accessibility, Dashboard, Library, Trends, Sessions, Characters, Practice, Game Theater (replay player), Settings, Component library consistency

### 2. Outcome and evaluation conveyed by color alone (WCAG 1.4.1)  `HIGH`

The two things a Melee player scans for — win/loss and whether a stat is good or bad — are encoded purely by hue with no non-color cue and often no accessible name. Win/loss ResultDots are identical 10px circles distinguished only by green vs red (the most common color-vision deficiency), with no shape/icon/text and frequently absent from the row's accessible name. Stat values in GameStats use only text color (mint/pink/neutral) for good/needs-work. The whole evaluative layer is invisible to ~8% of male users.

_Touches:_ Accessibility, Library, Sessions, Game Theater (replay player), Component library consistency

### 3. Keyboard affordances and focus-visible are inconsistent and incomplete  `HIGH`

The app has a branded accent focus ring (2px var(--accent)) on .btn/.tab/.char-card/.result-dot-button/.nav-item, but many interactive elements lack it or any keyboard path at all: Library table rows (focusable, no ring), .pill/.tweaks-chip/.tweaks-toggle-btn/.mode-btn/.radar-period-btn/.char-back-btn (UA ring only), coaching section toggles, timestamp jump links, and stock-timeline segments (clickable divs with no tabIndex/role/onKeyDown — fully keyboard-inaccessible). CoachingModal lacks dialog semantics, Escape-to-close, and focus management. The result is keyboard navigation that visually jumps between two languages and has dead zones.

_Touches:_ Accessibility, Dynamic & interaction states, Library, Trends, Coaching display, Game Theater (replay player)

### 4. No reduced-motion path and motion tokens bypassed by JS  `HIGH`

prefers-reduced-motion is honored only by a CSS @media block that zeroes CSS durations; every framer-motion animation (modal slides, KPI spring-stagger, nav pill, row hover scale, coaching-card reveal, stock-timeline scaleX) animates via inline JS transforms and ignores the OS flag entirely — there is zero MotionConfig/useReducedMotion/matchMedia in the renderer. Separately, the JS layer hardcodes eases/springs (multiple distinct bezier curves and stiffness/bounce values) instead of the --ease-spring/--ease-out tokens, and the route shell plus each page both animate the same fade-up entrance, so the 'feel' drifts per surface and tokens are not the source of truth.

_Touches:_ Motion & micro-interactions, Accessibility

### 5. Decorative MAGI watermark and translucency degrade data legibility  `MEDIUM`

The fixed full-bleed magimelee.svg watermark (app-layout::before, opacity ~0.15-0.18, z-index 0) plus a radial app-bg glow sit behind translucent .card surfaces (rgba alpha 0.6). On data-dense pages the logo letterforms and the reddish/indigo glow visibly bleed through behind chart lines, win-rate dots, and small metadata, reading as a rendering artifact rather than intentional depth and reducing legibility exactly where users read values.

_Touches:_ Trends, Sessions, Design system & tokens

### 6. Duplicate, dead, and unenforced CSS/token system  `MEDIUM`

The 'single source of truth' contradicts itself: .data-table and .winrate-bar are each defined twice with the later block silently overriding intended styling (the accent header underline and sharp corners never render), the entire 12-token --space-* grid has zero usages, and a long tail of tokens (--charcoal/--dark-spruce/--ember, --sidebar-accent, --purple-rgb, 4 of 6 chart-*, --shimmer/--surface-noise/--gradient-*/--plasma-*/--bg-glass*) are defined (some re-set every applyTheme) but never consumed. A stale 'Spring Green' header comment and green :root fallbacks describe a brand the app never shows and cause a green FOUC on cold start.

_Touches:_ Design system & tokens, Component library consistency, Coaching display

---

## Findings by severity

## 🟠 High (26)

### H1. "Import Replays" navigates to Settings instead of importing, and duplicates the empty-state CTA with a different label

**Area:** Dashboard  ·  **Category:** usability  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Dashboard.tsx:137 (onClick navigate('/settings')); Dashboard.tsx:116 (empty-state cta 'Open Settings' -> navigate('/settings'))`

**Issue.** The button labeled 'Import Replays' calls navigate('/settings') and performs no import. The empty-state CTA on the same page does the identical navigation but is labeled 'Open Settings', so one destination has two labels and the action labeled 'Import' imports nothing. window.clippi.importFolder/importAndAnalyze exist (global.d.ts:16-17) but the only exposed dialog is openFileDialog (file-only, global.d.ts:107), so wiring a true import needs a directory-picker IPC.

**Impact.** A user clicking 'Import Replays' expecting a folder picker is dropped onto the full Settings page, breaking the label-action contract; the two differently-labeled CTAs for the same task feel arbitrary between first-run and steady-state.

**Fix.** Standardize on one label and button style across both CTAs (e.g. .btn-primary 'Import Replays') and route to a real import flow; add a directory-picker IPC if none exists. Treat as more than a label swap.

---

### H2. Primary 'Import Replays' action is a low-priority plain button stacked below the title, not a top-right primary

**Area:** Dashboard  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Dashboard.tsx:136-140; src/renderer/styles/typography.css:22-26 (.page-header, no display:flex); src/renderer/styles/components.css:108-167 (.btn/.btn-primary); screenshots/app-dashboard.png header band`

**Issue.** Import uses plain .btn (surface-1 fill, 11px uppercase mono, gray border) instead of .btn-primary (accent fill). .page-header sets only margin/padding/border-left with no display:flex and there is no actions wrapper, so its block children stack vertically and the button renders BELOW the title/subtitle, left-aligned. The full-res crop confirms the button sits under 'DASHBOARD'/the W-L line, not top-right.

**Impact.** The single most important first-run/ongoing CTA has no visual weight and lands where the eye does not expect an action, so a player with a near-empty library may not realize how to add data.

**Fix.** Add display:flex; justify-content:space-between; align-items:center to .page-header (or wrap title and actions and flex the wrapper) so actions sit top-right, and change the button to className='btn btn-primary' (components.css:140-147).

---

### H3. --text-muted fails WCAG AA for normal text in the shipped liquid theme and the telemetry/fallback theme

**Area:** Design system & tokens / Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/themes.ts:83 (liquid #6a707b, applied via applyTheme :382), themes.ts:132 (telemetry #64748b); tokens.css:33; 66+ `color: var(--text-muted)` occurrences plus inline uses (Dashboard.tsx:216, Library.tsx:193) and ::placeholder (components.css:1412, 1632)`

**Issue.** Computed against the ACTUAL runtime surfaces (liquid surfaces are white-over-bg with alpha, bg #0a0d14): liquid --text-muted #6a707b = 3.9:1 on bg, 3.61:1 on surface-1, 3.26:1 on surface-2, 2.88:1 on surface-3 — all below 4.5:1 AA. Telemetry #64748b = 3.75:1 on bg #0f172a, 3.07:1 on surface-1 #1e293b, 2.18:1 on surface-2 #334155. Several uses are 9-12px (card titles, page-header subtitles, stat labels). The .kpi-sub liquid override (components.css:2242) rescues KPI deltas but inline-style and ::placeholder usages cannot be rescued by a selector. NOTE: --text-dim is NOT a safe fix in liquid — applyTheme aliases it to textSecondary at runtime (themes.ts:414).

**Impact.** The lowest text tier — card titles, subtitles, stat/label text, placeholders — is hard to read for low-vision users in both default themes, worst on telemetry's elevated surface-2 rows (2.18:1).

**Fix.** For any text <18px switch to --text-secondary (liquid #cfd4dc = ~12:1 on surface-1; telemetry #cbd5e1 = 9.85:1 on surface-1, 6.97:1 on surface-2). Alternatively raise the muted token to clear 4.5:1 on surface-1 (e.g. telemetry ~#8b94a3 = 4.78:1; liquid ~#8b929d = 5.74:1) and re-verify surface-3 usages.

---

### H4. Light theme --text-muted (#94a3b8) fails AA on all light surfaces

**Area:** Design system & tokens  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `tokens.css:158 and themes.ts:306 (light textMuted #94a3b8)`

**Issue.** Light --text-muted #94a3b8 on --bg #ffffff = 2.56:1, on --surface-1 #f8fafc = 2.45:1, on --surface-2 #f1f5f9 = 2.34:1 — far below 4.5:1 AA and below the 3:1 large-text floor. It drives the same small labels as dark (.card-title 9px, .page-header p 10px).

**Impact.** In light mode every muted label/subtitle is washed out to near-illegible on white — a clear accessibility failure on the brightest surfaces.

**Fix.** Darken light --text-muted to ~Slate-500 #64748b (4.76:1 on white). This converges with light --text-dim #64748b, so either accept the convergence or re-tier all three light grays (e.g. muted #64748b, dim #475569, secondary #334155) so all clear 4.5:1 while staying distinct.

---

### H5. Fixed 9-column table layout starves data columns and silently truncates content

**Area:** Library  ·  **Category:** layout  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:206 (table-layout:fixed); src/renderer/components/ui/DataTable.tsx:8-12 (no colgroup); src/renderer/pages/Library.tsx:124-135 (9 columns); screenshots/app-library.png`

**Issue.** .data-table is table-layout:fixed and neither DataTable nor Library emits a <colgroup>, so all 9 columns get ~equal (~11%) width. The 10px Result-dot column gets the same width as the long 'Char vs Char' Matchup, Opponent, and Stage strings; td has overflow:hidden + ellipsis (components.css:228-230) so over-long values clip with no tooltip. The screenshot shows Matchup/Opponent/Stage pinched while the dot column wastes space.

**Impact.** Scanning match history is the page's core job; the primary scan columns get the same cramped width as a tiny dot, and overflow is hidden with no recourse.

**Fix.** Add a <colgroup> (or a Library-specific table class unsetting table-layout:fixed): dot column ~32px, Matchup ~22%, Opponent/Stage generous shares, the four mono numeric columns fixed ~72px right-aligned.

---

### H6. Date column text fails WCAG AA under the active liquid theme (~3.6:1, ~3.3:1 on hover)

**Area:** Library  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Library.tsx:193 (fontSize:11, color var(--text-muted)); themes.ts:83 (liquid --text-muted #6a707b); components.css:255-256 (hover -> --surface-2)`

**Issue.** The Date cell renders at 11px in var(--text-muted). In the active liquid theme --text-muted = #6a707b over translucent card surfaces on bg #0a0d14: ~3.60:1 resting, ~3.27:1 on the --surface-2 hover background — both below 4.5:1 AA for 11px text, and it worsens on hover (exactly when the user targets the row).

**Impact.** Dates are how a player locates a recent session; at ~3.6:1 and 11px they are hard to read and degrade on hover.

**Fix.** Change the Date cell to var(--text-secondary) (liquid #cfd4dc ≈ 12:1 resting, ~11:1 hover) and bump fontSize 11 -> 12 to match the table baseline. Avoid --text-dim (aliases to text-secondary in liquid but falls back to #94a3b8 inconsistently across themes).

---

### H7. Keyboard-focusable table rows have no visible focus indicator

**Area:** Library / Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Library.tsx:158-171 (tabIndex={0}, role='button', onKeyDown); components.css (no .data-table tr:focus/:focus-visible rule)`

**Issue.** Each row is interactive (tabIndex={0}, role='button', Enter/Space) but no focus style exists for rows. :focus-visible appears only on .result-dot-button, .btn, .tab, .char-card, .nav-item — nothing for .data-table tbody tr. The only affordance (the ::after sweep + surface-2 background, components.css:252-257) is bound to :hover, not :focus.

**Impact.** A keyboard user tabbing through up to 500 focusable rows gets zero indication of which row is selected before pressing Enter — the interactive affordance is invisible without a mouse.

**Fix.** Add .data-table tbody tr:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px } (negative offset keeps it inside overflow:hidden cells) and mirror the :hover background/::after sweep on :focus-visible.

---

### H8. Trends hero chart auto-scales to data min/max, so a 1pp wiggle looks like a 30pp collapse

**Area:** Trends  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ui/Sparkline.tsx:6-13; Trends.tsx:74,145`

**Issue.** buildSparklinePoints computes range = (max-min)||1 and maps min->bottom, max->top, so the polyline always fills the full 260px height regardless of real spread, with zero y-axis labels/ticks. A near-flat Neutral WR and a genuine 30pp collapse render as the identical alarming sawtooth in screenshots/app-trends.png.

**Impact.** On the hero element of a page literally named 'Trends', the chart conveys no magnitude and can actively mislead.

**Fix.** Anchor the y-domain for pct metrics (0-100%, or a padded window for raw metrics) and render >=3 labeled y-gridlines. charts.css already styles Recharts axis/grid, so swapping the hero Sparkline for a Recharts LineChart with a domain-bounded YAxis is low-cost.

---

### H9. Trends hero/mini charts have no time x-axis because getTrendSeries discards dates

**Area:** Trends  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/db.ts:2472-2494 (returns rows.map(r=>r.v)); src/renderer/hooks/queries.ts:172-188; Trends.tsx:145`

**Issue.** getTrendSeries SELECTs only the metric column and returns a plain number[]; played_at is used only for ORDER BY, never returned. Sparkline spaces points by array index (x=i/(len-1)*w) with no x labels, despite the '5-game rolling avg' header implying time. 10 games in one day and 10 over a month render identically.

**Impact.** Users cannot tell whether a dip happened last night or three weeks ago, nor how dense their sessions were; index spacing distorts time.

**Fix.** Change getTrendSeries (db.ts:2484) to also SELECT g.played_at and return {date,value}[]; thread dates through useTrendSeries (queries.ts:172) and render a real time x-axis with start/mid/end ticks. This is a data-shape fix, not just unstyled SVG.

---

### H10. Opponent-character filter silently drops every matchup after the 8th alphabetically

**Area:** Trends  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Trends.tsx:105 (chars.slice(0,8))`

**Issue.** Only the first 8 sorted opponent characters render; the screenshot stops at Bowser..Ganon with no 'More', search, or scroll, so Marth, Peach, Sheik, Jigglypuff, Yoshi, etc. are completely unreachable as filters.

**Impact.** A player who needs to isolate the Marth/Sheik/Fox matchup trend simply cannot, defeating a primary purpose of the filter.

**Fix.** Render the full sorted chars list (drop the .slice(0,8)) inside a horizontally scrollable PillRow or a searchable combobox; if a cap is wanted, surface the remainder behind a 'More…' control rather than discarding them.

---

### H11. Sessions W/L record and dot row disagree: non-win games render as red loss dots

**Area:** Sessions  ·  **Category:** content  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/pages/Sessions.tsx:75; src/db.ts:2392-2396; src/renderer/components/ui/ResultDot.tsx:3; screenshots/_crop_card.png`

**Issue.** getSessionsByDay increments `games` for every row but only increments wins/losses when result is exactly 'win'/'loss'; any other stored result (draw, empty, unparsed) is in `games` but neither W nor L. Sessions.tsx:75 then renders result==='win'?'win':'loss', collapsing every non-win game to a red loss dot (ResultDot/CSS define only .win/.loss). The 'Thu, May 28' card reads '23 games · 4W-5L' (9 accounted) yet renders 23 dots with ~19 red.

**Impact.** A player auditing their record sees self-contradictory numbers: header wins+losses (9) != games (23), the dot row inflates losses to ~19, and the 17% win-rate top-right disagrees — undermining trust in every number on the card.

**Fix.** Add a draw/neutral state end-to-end: extend ResultDot to accept 'draw' with a .result-dot.draw using --caution #fbbf24 (plus liquid variant); stop the result==='win'?'win':'loss' collapse at Sessions.tsx:75 and pass the real result; reconcile the header so games == wins + losses + draws.

---

### H12. Game & Watch name color is hardcoded near-black hex — the label is invisible on its always-rendered tile

**Area:** Characters  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/pages/Characters.tsx:107 (G&W color '#1e293b'), applied inline at Characters.tsx:412 over .character-tile-info background var(--surface-1) (components.css:2903)`

**Issue.** G&W's CHARACTER_META.color is the literal '#1e293b'. Its tile renders unconditionally (grid from Object.keys(CHARACTER_META), 26 tiles) and it is the one META key absent from CHARACTER_IMAGE_NAMES, so it falls back to emoji plus this unreadable label. Contrast of #1e293b on the tile-info surface is 1.00:1 in telemetry (where --surface-1 = #1e293b) and ~1.1:1 in liquid — invisible in every theme.

**Impact.** Any user with G&W games sees a card whose name is the same tone as its panel; the tile is identifiable only by the bell emoji, defeating roster scanning.

**Fix.** Replace the G&W color with a legible value (~#cbd5e1 / --text-secondary). Better: never apply meta.color as the name color — render .character-tile-name in --text and use meta.color only as an accent, clamping to >=4.5:1 against the resolved --surface-1.

---

### H13. Character detail view has no empty state for unplayed characters and fires a wasted LLM call

**Area:** Characters  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Characters.tsx:435-597 (CharacterDetail; totalGames :443, flank fallback :470-479, matchups :553, CTA :535-537); src/renderer/components/CoachingModal.tsx:81-85 (auto-fire analyzeScoped)`

**Issue.** All 26 tiles navigate, including unplayed ones (only get .character-tile-unplayed opacity, still onClick at :402). Opening an unplayed character gives totalGames===0, so heroStats=[] and sigItems=[]; flankItems falls back to heroStats which is also [], the Matchups table renders an empty tbody, and there is no 'no games yet' message. The 'Analyze Matchup' button stays enabled and CoachingModal auto-runs analyzeScoped('character', id) on open with no empty-data guard — a wasted LLM call about a never-played character.

**Impact.** An easy misclick (unplayed tiles fill the lower grid) drops the user into a blank detail page and lets them spend an LLM request analyzing nothing.

**Fix.** When totalGames===0, render an empty state ('You haven\'t played {character} yet — import replays to see stats') and disable/hide the Analyze Matchup button. Optionally guard onClick at Characters.tsx:402 on games>0.

---

### H14. Oracle example prompts are inert dim text, not clickable starter chips

**Area:** Oracle (chat)  ·  **Category:** usability  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/pages/Oracle.tsx:66-69; src/renderer/components/ui/EmptyState.tsx:6-23`

**Issue.** Both example questions are passed as a single `sub` string rendered as one static <p>. EmptyState only supports title/sub/optional single cta — there is no per-prompt onClick. Nothing makes the examples actionable; the user must retype them.

**Impact.** One-tap starter prompts are the strongest affordance an empty chat can offer, and the tool's value is gated behind asking the right question. Treating suggestions as decoration is a significant lost first-query activation path.

**Fix.** Render each example as a button (e.g. .btn-ghost) that calls setInput(prompt) then submit(). Replace the single `sub` string with an array of starter questions mapped to chip buttons below the heading; this also fills the centered empty space meaningfully.

---

### H15. Practice 'DELETE PLAN' deletes immediately with no confirmation, breaking the app's destructive-action pattern

**Area:** Practice  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Practice.tsx:86-89 (onDelete) and :157 (button)`

**Issue.** onDelete calls window.clippi.deletePracticePlan(planId) and filters the plan out of state instantly on click — no confirm(), no undo. Every other destructive action gates on confirm(): Oracle clear-history (Oracle.tsx:45), Settings delete-all (Settings.tsx:267), CommandPalette delete-all (CommandPalette.tsx:302). Practice is the only one that skips it.

**Impact.** A single mis-click permanently destroys a multi-drill plan and its tracked progress that required an LLM round-trip to generate, breaking the 'destructive = confirm' muscle memory.

**Fix.** Prepend `if (!confirm('Delete this practice plan and its progress?')) return;` before the IPC call at Practice.tsx:87, matching the existing pattern.

---

### H16. Game Theater stat-group labels and badge-neutral fail WCAG AA contrast (the smallest, most context-critical text)

**Area:** Game Theater (replay player) / Component library consistency  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2761-2772 (.stat-group-cell + .stat-group-label), 2308-2311 (.badge-neutral)`

**Issue.** The 10px uppercase stat-group labels (NEUTRAL WR, L-CANCEL, RECOVERY, DEATH %, EDGEGUARD, DMG/OP) use --text-muted on .stat-group-cell background --surface-2. Telemetry: #64748b on #334155 = 2.18:1. Liquid: #6a707b over the layered translucent surface-2 stack ≈ 2.9-3.0:1. .badge-neutral is the same #64748b on --surface-2 = 2.18:1. All small text, all below 4.5:1 AA.

**Impact.** These labels are the only thing telling a player which raw number is which (37.5%, 13.1, 429 are meaningless without them) — the smallest text on the densest panel, failing exactly where users most need to read.

**Fix.** Switch .stat-group-label and .badge-neutral color from var(--text-muted) to var(--text-secondary) (telemetry #cbd5e1 = 6.97:1 on surface-2; liquid #cfd4dc ≈ 9.7:1). Do NOT use --text-dim: #94a3b8 on #334155 is only 4.04:1.

---

### H17. Game stats encode good/bad by text color alone (WCAG 1.4.1)

**Area:** Game Theater (replay player)  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ui/StatGroupCard.tsx:27 (inline style.color keyed off it.good); GameStats.tsx:40-80`

**Issue.** Each stat value's only good/needs-work signal is its text color: --win mint for good, --loss pink for bad, --text neutral. No icon, arrow, +/- sign, glyph, or aria-label — StatGroupCard renders the bare value with a color style only. A red/green colorblind user cannot distinguish a good Neutral WR from a bad one.

**Impact.** The numbers stay readable but the entire evaluative layer (the point of coloring values) is invisible to colorblind players, who are over-represented in gaming.

**Fix.** Pair color with a non-color cue: prepend a small ArrowUp/ArrowDown or check/dot glyph keyed off `good`, and/or add aria-label like 'Neutral WR 37.5%, below target'. Keep color as reinforcement.

---

### H18. Saving Settings can silently revert the theme chosen in the Tweaks panel

**Area:** Settings  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Settings.tsx:162-169 (handleSave), :90-100 (config load incl. theme/colorMode); src/config.ts:139 (shallow merge); TweaksPanel.tsx:14-23`

**Issue.** Settings loads the full config (incl. theme+colorMode) at mount and never updates those two fields. handleSave spreads the entire object (`const payload = {...config}`) and only deletes apiKeys. Theme/density live in the floating TweaksPanel which autosaves via saveConfig({colorMode}). saveConfig does a shallow merge, so open Settings -> switch theme via Tweaks -> click Save writes back the STALE colorMode captured at Settings mount, reverting the theme. TweaksPanel floats on every page, so this sequence is realistic.

**Impact.** A user's theme choice is silently undone by an unrelated Save action with no warning — a confusing, hard-to-diagnose state-loss bug.

**Fix.** Build the payload from only Settings-owned fields (targetPlayer, connectCode, replayFolder, dolphinPath, meleeIsoPath, activeProvider, modelByProvider, localEndpoint) plus key edits; or explicitly `delete payload.theme; delete payload.colorMode;` mirroring the existing apiKeys deletion.

---

### H19. CoachingModal lacks dialog semantics, Escape-to-close, and focus management

**Area:** Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/CoachingModal.tsx:91-153`

**Issue.** The surface renders as <div className='modal-overlay' onClick={onClose}> wrapping a motion.div with no role='dialog', no aria-modal='true', no aria-labelledby; the h2 'MAGI Coaching' has no id; the file has no Escape keydown effect and no focus-move/focus-trap. By contrast CommandPalette.tsx:440-442 and TweaksPanel.tsx:46 set these — the pattern exists and is simply missing here.

**Impact.** Screen readers are not told a dialog opened and background is not inert (focus can Tab out behind the panel); keyboard users cannot Escape to dismiss. This is the app's primary AI-coaching view.

**Fix.** Add role='dialog' aria-modal='true' aria-labelledby (give the h2 an id) to the panel; add a useEffect that calls onClose on Escape while open; move focus to the panel/close button on open and restore on close. Mirror CommandPalette.tsx:440-442.

---

### H20. Win/loss conveyed by color-only dot with no shape/icon/text, and absent from Library row accessible name

**Area:** Accessibility / Library / Sessions  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/ResultDot.tsx:3-4; components.css:2313-2325; src/renderer/pages/Library.tsx:126,169-173; src/renderer/pages/Sessions.tsx:65-78`

**Issue.** ResultDot renders a bare <span className={`result-dot ${result}`}/> whose only win/loss differentiator is background color (.win green w/ glow, .loss red) — identical 10px circle, no shape/icon/text/title/aria. In Library the dot sits in an empty <th></th> first cell while the row aria-label is `Open ${g.opponentTag} game on ${g.stage}` and never includes the result. Sessions uses the same component (its dots are mitigated only by an SR-only aria-label on the wrapping button). Red-green is the most common color-vision deficiency.

**Impact.** Colorblind users cannot distinguish win from loss in the Library table, and screen-reader users get no result for a row — defeating the core 'scan my W/L history' task.

**Fix.** Give ResultDot a non-color cue (check/x glyph or distinct filled-vs-ringed shape) AND a visually-hidden <span>{result}</span> for assistive tech; give the Library column a real header ('Res') and include the outcome in the row aria-label: `Open ${g.result} vs ${g.opponentTag} on ${g.stage}`.

---

### H21. prefers-reduced-motion is ignored by every framer-motion animation

**Area:** Accessibility / Motion & micro-interactions  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/animations.css:222-232 (CSS-only reduce block); LiquidShell.tsx:50,81-83,110-113; CoachingModal.tsx:96-99; ReplayPlayer.tsx:225-228; Dashboard.tsx:143-167,307-313; CoachingCards.tsx:85-117; StockTimeline.tsx:130-139; wrap point App.tsx:150-164 / main.tsx:19`

**Issue.** The only reduced-motion handling is a CSS @media block that zeroes CSS durations; it does not affect framer-motion, which animates via inline JS transforms. Grep across src/renderer for reducedMotion/useReducedMotion/MotionConfig/matchMedia returns ZERO hits. So the modal slide-in, logo spring, KPI spring-stagger, nav pill, row stagger + hover scale, coaching-card reveal, and stock-timeline scaleX all play in full regardless of the OS flag — the most visible motions bypass the setting.

**Impact.** Users who enable OS reduced motion (a vestibular/motion-sickness accommodation) still get the full barrage of springs, slides, and a 100%-width modal swoop; the accommodation is effectively non-functional.

**Fix.** Wrap the app root in <MotionConfig reducedMotion='user'> (App.tsx:150-164 or main.tsx:19) — framer v12 then auto-skips transform/x/y/scale/rotate, preserving opacity. For bespoke transform cases (StockTimeline scaleX, CoachingCards height:0->auto) additionally branch on useReducedMotion() to render the final state instantly.

---

### H22. Ctrl+K command palette and numeric nav shortcuts are entirely undiscoverable

**Area:** Navigation, IA & window behavior  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/CommandPalette.tsx:108-147 (keyboard-only open + Ctrl+1-8); screenshots/app-dashboard.png header row`

**Issue.** The palette opens only via Cmd/Ctrl+K and the Ctrl+1-8 page jumps are keyboard-only. A repo-wide grep finds 'Ctrl+K' referenced only inside CommandPalette.tsx; the dashboard header shows only a title + 'IMPORT REPLAYS' with empty space to its right and no entry point. The fuzzy command list, numeric jumps, and opponent search (getOpponents) are reachable only by users who already know the shortcut.

**Impact.** Primary navigation is still reachable via the rail (not a blocker), but the only fast opponent lookup and quick-jumps are invisible — the fuzzy-match and opponent-search engineering is effectively dead UI for most users.

**Fix.** Add a persistent 'Search… ⌘K / Ctrl K' pill in the dashboard page-header free space wired to open(); at minimum render a static 'Ctrl K' kbd hint in the sidebar footer (LiquidShell.tsx:94-103) reusing .cmd-kbd (components.css:1414).

---

### H23. Theme & density live only in the floating gear; Settings has no Appearance section

**Area:** Navigation, IA & window behavior  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/components/TweaksPanel.tsx:54-78 (sole theme/density UI); src/renderer/pages/Settings.tsx (colorMode/theme only in Config interface :17-18, never rendered)`

**Issue.** The TweaksPanel gear is the ONLY place to change theme or density. Settings renders Player, Replay Folder, Dolphin, AI Provider, and Danger Zone — no Appearance/Theme control anywhere; colorMode is only a persisted Config field. The gear's tooltip is just 'Tweaks'.

**Impact.** Users overwhelmingly look for theme under a 'Settings' nav item; they will open Settings, find no appearance controls, and may never connect the unlabeled floating cog to theming. A primary personalization feature has no discoverable home.

**Fix.** Add an 'Appearance' Card to Settings (theme chips + density toggle) reusing the setColorMode/setDensity store actions (useGlobalStore is already imported into Settings.tsx:4). Keep the gear as a quick shortcut only if relabeled from 'Tweaks' to 'Appearance'.

---

### H24. Dashboard MAGI Oracle bypasses CoachingCards and renders a raw markdown wall in a choked 1fr column

**Area:** Coaching display  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/pages/Dashboard.tsx:393-394 (OracleInsightCard); dashboard.css:11-13,66-70; screenshots/app-dashboard.png right column`

**Issue.** The Oracle insight renders as bare <Markdown>{insight}</Markdown> inside .dash-oracle-body (13px, color text-secondary), NOT the CoachingCards component every other coaching surface uses. It sits in the 1fr side of the 2fr 1fr .dash-split grid, so the measure is very narrow and the prose becomes a tall, unbroken column — the screenshot shows a ~9+ line paragraph with no headings or scan anchors, the least-scannable coaching surface in the app.

**Impact.** The first coaching a user sees on launch is the hardest to read; narrow 13px prose with no structure discourages reading the very output the app exists to produce.

**Fix.** Route the Oracle through CoachingCards for consistent structured display, OR if keeping prose: bump .dash-oracle-body to 14px, add max-width:60ch, and give it its own full-width row (span both columns) so the measure isn't choked at ~1/3 width.

---

### H25. Streaming coaching has no autoscroll and the live cursor is hidden inside collapsed sections

**Area:** Coaching display  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/CoachingModal.tsx:116-133; CoachingPanel.tsx:100-113; CoachingCards.tsx:57,111,121`

**Issue.** Two compounding problems (grep confirms zero scrollIntoView/scrollTop/useRef in CoachingModal/CoachingPanel): (1) No autoscroll — neither component scrolls on new chunks, so as cards mount with y:12 and bodies animate height 0->auto, new text grows below the fold while the viewport stays put. (2) DEFAULT_EXPANDED=3 collapses sections 4+, and the streaming cursor only renders inside an expanded body. When the streaming section is the 4th+, it is collapsed: the user sees a static first-sentence summary with no cursor and no growth, so generation looks frozen.

**Impact.** During the multi-second stream the user cannot tell new text is arriving and must manually scroll; later sections appear to stall, undercutting the perceived responsiveness of the core feature.

**Fix.** Add a ref to the scroll container and set scrollTop=scrollHeight on chunk arrival while streaming, gated behind prefers-reduced-motion. In CoachingCards, force-expand the last incomplete section regardless of DEFAULT_EXPANDED, or render the cursor on the collapsed header of an incomplete section.

---

### H26. Duplicate .data-table blocks silently drop the intended 2px accent header underline

**Area:** Component library consistency  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:203-257 vs 2372-2400 (confirmed: .data-table defined at both :203 and :2372)`

**Issue.** .data-table/th/td are defined twice with equal specificity, so the cascade merges per-property (later wins on conflicts). The legacy header (line 216) sets border-bottom: 2px solid var(--accent) + a faint accent-tint background; the later block (line 2385) re-declares th with border-bottom: 1px solid var(--border) and no background, which wins — so the intended broadcast-style accent header never renders. Padding also conflicts; legacy-only behaviors (table-layout:fixed, mono font, zebra, ellipsis, hover sweep) survive.

**Impact.** DataTable's signature accent header is silently overridden, and anyone tuning table density fights two sources of truth.

**Fix.** Collapse to one .data-table block: keep the feature-rich legacy version (accent 2px header, accent-tint bg, fixed layout, zebra, ellipsis, hover sweep) and delete the bare redefinition at components.css:2372-2400, or merge its padding/font-size into the legacy block.

---

## 🟡 Medium (55)

### M1. Oracle prose is an unbounded vertical wall of text with no max-height or internal scroll

**Area:** Dashboard  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/dashboard.css:66-73 (.dash-oracle-body); Dashboard.tsx:393-396; screenshots/app-dashboard.png right column`

**Issue.** .dash-oracle-body sets only font-size/line-height/color — no max-height, no overflow-y. The prompt asks for one paragraph but models over-produce, and .main-content is overflow-y:auto, so a long response grows the card and pushes the whole page past the viewport (the overflow:hidden on .card clips only the decorative glow, not text). The screenshot already shows the prose filling the full viewport height as one ~13px block.

**Impact.** Coaching text becomes a dense, unskimmable column readable only by scrolling the entire page, undermining the panel's at-a-glance purpose.

**Fix.** Give .dash-oracle-body max-height: min(420px, 60vh) with overflow-y:auto so prose scrolls within the card; optionally render the first sentence as a bold lede and tighten the prompt.

---

### M2. Dashboard's most-text element (Oracle) sits in the narrowest grid track; .dash-split has no minmax or reflow

**Area:** Dashboard / Navigation, IA & window behavior  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/dashboard.css:11-16 (.dash-split 2fr 1fr); screenshots/app-dashboard.png`

**Issue.** .dash-split is a fixed 2fr 1fr grid with no minmax() and no breakpoint. The content-heaviest element (Oracle paragraph) is in the 1fr track while sparkline charts get 2fr, inverting visual weight. As the window narrows the 1fr column shrinks into a tall thin ribbon; the only media queries (components.css:3087/3097) target .character-hero-stage, not these grids. At the 900px minimum window (~600px usable after 220px rail) the Oracle column drops to ~200px.

**Impact.** Reading comfort for the coaching prose degrades at both small and large window sizes, with the most text in the smallest box.

**Fix.** Use grid-template-columns: minmax(420px,2fr) minmax(320px,1fr) to floor each track (consider swapping proportions to give Oracle the wider track), and add @media (max-width:1100px) collapsing .dash-split to 1fr and .dash-spark-grid to auto-fit, mirroring .kpi-grid (components.css:2180).

---

### M3. Dashboard always-on muted labels (sparkline labels, 'Last 10') fail WCAG AA

**Area:** Dashboard  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/dashboard.css:53 (.dash-spark-label --text-muted); Dashboard.tsx:216 ('Last 10' inline var(--text-muted))`

**Issue.** These always-visible 10-12px labels use --text-muted, which in the liquid theme (#6a707b over translucent surfaces) computes ~3.6:1 and in telemetry (#64748b on #1e293b) 3.07:1 — below 4.5:1 AA. Distinct from the KPI-label cluster (different selectors/locations).

**Impact.** The persistent small labels that identify each metric are hard to read for low-vision users on the dark surface.

**Fix.** Set .dash-spark-label and the 'Last 10' span to var(--text-secondary) (liquid #cfd4dc, telemetry #cbd5e1) — both pass AA.

---

### M4. KPI labels and neutral KPI sub fail AA; the liquid override is dead because of an inline style

**Area:** Library / Dashboard / Component library consistency  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:2192-2198 (.kpi-label 10px --text-muted), 2242-2247 (liquid .kpi-sub -> text-secondary); src/renderer/components/ui/KPI.tsx:11,17 (inline color var(--text-muted) for neutral tone)`

**Issue.** .kpi-label is 10px in --text-muted on --surface-1 = 3.07:1 telemetry / ~3.6:1 liquid, and has no liquid override. KPI.tsx applies an inline color var(--text-muted) for the neutral subTone (used at :17); inline styles beat the stylesheet, so the liquid .kpi-sub -> text-secondary fix at components.css:2245 never wins for neutral subs. Good/bad subs use --win/--loss and pass.

**Impact.** The labels and neutral context (sample size, W/L split) under each big number — the densest data on Dashboard/Trends KPI grids — sit below readable contrast in both themes.

**Fix.** Bump .kpi-label to 11-12px and change to var(--text-secondary). In KPI.tsx change the neutral branch of subColor to var(--text-secondary) (or drop the inline color for neutral so the stylesheet rule wins).

---

### M5. Active filters have no summary and no clear/reset affordance

**Area:** Library  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Library.tsx:68-119 (filter bar), :38-44 (only 'N of M games' text)`

**Issue.** Four filters (search, matchup select, stage select, result pills) combine, but the only signal that filters are active is the 'N of M games' count. There is no chip/summary of applied filters and no single reset — to clear, the user must empty search, set both selects back to 'All…', and click the 'all' pill individually.

**Impact.** After narrowing to e.g. Marth-on-Battlefield-losses, a player who forgets one active select is confused why history looks empty, and resetting is a 4-step chore.

**Fix.** Add a 'Clear filters' button shown when any filter differs from default that resets all four setters; optionally render active filters as removable chips next to the count line.

---

### M6. Library renders all rows unvirtualized with a hard 500-game ceiling and no pagination

**Area:** Library  ·  **Category:** performance  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/pages/Library.tsx:15 (useRecentGames(500)), :147 (filtered.slice(0,500).map); components.css:241-251 (per-row ::after animation)`

**Issue.** Up to 500 games are fetched and every row (a focusable node with onClick/onKeyDown and an animated ::after) mounts at once with no windowing. There is no pagination or 'load older' path beyond the most recent 500, so a deep history can never reach game #501 from this page.

**Impact.** Mounting hundreds of interactive animated rows risks scroll jank in the Electron renderer, and the silent 500-game ceiling means long-time players cannot review older sets here.

**Fix.** Virtualize the table body (e.g. @tanstack/react-virtual) so only visible rows mount, and paginate or add a 'load more' control plus a visible note when the result hits the 500-row cap.

---

### M7. Library rolls its own loading/empty cells and shows misleading first-run copy

**Area:** Dynamic & interaction states / Library  ·  **Category:** content  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Library.tsx:15,138-145`

**Issue.** Library does not use the shared EmptyState (used by Dashboard/Trends). Loading renders a bare 'Loading…' cell with no spinner; zero rows always renders 'No games match the filters.' Because that branch is filtered.length===0 with no separate games.length===0 check, true first run (no replays, no filter) still says 'No games match the filters', implying the user filtered something out rather than telling them to import.

**Impact.** First-run users are told their nonexistent filters hid everything, with no import path — inconsistent with Dashboard's 'No replays imported yet' EmptyState + CTA. The plain-text 'Loading…' also lacks the .spinner used elsewhere.

**Fix.** Branch on games.length===0 (first run -> EmptyState 'No replays imported yet' + 'Open Settings' CTA) vs filtered.length===0 with games present ('No games match the filters'); replace the bare 'Loading…' cell with the existing .spinner.

---

### M8. Data-fetching pages have no error/retry state and fail silently

**Area:** Dynamic & interaction states  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Library.tsx:15, Trends.tsx:71, Characters.tsx:347, Sessions.tsx:99 (all destructure data/isLoading only, no isError)`

**Issue.** ErrorBoundary only catches render-time throws, not rejected react-query promises. Library, Trends, Characters and Sessions never read isError, so an IPC/DB failure resolves to the default empty array and renders an empty/zeroed view indistinguishable from 'no data'. Characters also lacks isLoading, momentarily showing the full grid with all-zero records before data arrives.

**Impact.** When a query fails the user sees an empty Library, a flat Trends chart, or an all-zero Characters grid with no message and no retry — they cannot distinguish a real failure from genuinely having no data.

**Fix.** Read isError from these hooks and render an inline error block with a retry (refetch). The .sessions-error style already exists (components.css:1603-1611) but is orphaned — standardize all four pages on it.

---

### M9. Trends charts are non-interactive: no hover tooltip, crosshair, or per-point readout

**Area:** Trends  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ui/Sparkline.tsx:51-85; Trends.tsx:120,145,194,201`

**Issue.** The Sparkline SVG renders only a polyline, area, gridlines, and a single end-point circle — no per-point hit targets, tooltip, or crosshair. The only numeric readout is the last smoothed value. charts.css defines .recharts-default-tooltip styling but no Recharts component is rendered here, so that CSS is dead.

**Impact.** Users can never inspect an individual game's value or read intermediate points; they only ever see the latest smoothed number, removing the core affordance people expect from a trend chart.

**Fix.** Add a hover crosshair + tooltip showing date and value (requires the {date,value}[] data change). Migrating the hero chart to Recharts would activate the existing .recharts-default-tooltip styling with no new CSS.

---

### M10. Translucent card lets the radial glow and MAGI watermark bleed behind chart/card data

**Area:** Trends / Sessions  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:42 (.card rgba(30,41,59,0.6)); layout.css:11-23 (.app-layout::before, magimelee.svg opacity ~0.15-0.18 + radial glow); screenshots/app-trends.png, screenshots/_crop_card.png, screenshots/_crop_watermark.png`

**Issue.** .card background is rgba alpha 0.6 and the fixed full-bleed watermark sits at z-index 0 with a radial app-bg glow. On Trends the reddish wash overlaps the green line and the faint MAGI wordmark bleeds through the card's top edge; on Sessions the logo letterforms render through cards as curved light arcs crossing behind dot rows, win% and the opponents line where the logo is densest.

**Impact.** Decorative branding sits behind quantitative data, reducing line/text legibility exactly where the user reads a value, and reads as a rendering artifact rather than intentional depth.

**Fix.** Give data-dense cards an opaque plot plate: raise .card opacity toward ~0.85-0.95 (or wrap charts in a solid var(--surface-1) inner element), or lower --magi-bg-logo-opacity on data pages. The watermark still reads at the page margins.

---

### M11. Trends range/metric pills and clickable mini-chart cards have no custom focus ring

**Area:** Trends  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:2255-2287 (.pill, no :focus-visible); Trends.tsx:174-187 (role=button MiniChart card, no .card:focus-visible)`

**Issue.** .pill defines :hover and .active but no :focus-visible, and the MiniChart Card is role=button tabIndex=0 with no .card:focus-visible anywhere. By contrast .btn/.tab/.char-card/.nav-item/.result-dot-button all define 2px var(--accent) rings. (The .pill ring is also tracked in the app-wide focus-consistency finding; the role=button MiniChart cards are unique to this page.)

**Impact.** Keyboard users tabbing the 7D/30D/ALL range, the six metric pills, the opponent pills, and the five mini-chart cards get only the UA default outline, easily lost on the glass surfaces on this control-heavy page.

**Fix.** Add .pill:focus-visible and a :focus-visible rule for the role=button cards reusing outline: 2px solid var(--accent); outline-offset: 2px.

---

### M12. Trends hero metric label rendered at 9px, inverting hierarchy against the 48px value

**Area:** Trends  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:68-69 (.card-title 9px); Trends.tsx:117,119`

**Issue.** .card-title is 9px and is reused for the metric name 'NEUTRAL WR' that sits above the 48px kpi-value. The screenshot shows 53.7% dominating while its caption is barely legible. Since the metric is switchable via pills, this microscopic label is the only thing identifying the giant number.

**Impact.** 9px is below comfortable desktop reading size and the hierarchy is inverted — the identifier is smaller than it should be relative to its value.

**Fix.** Give the hero label its own class (e.g. .trends-hero-label) at 12-13px instead of reusing the 9px .card-title.

---

### M13. Trends 'Opponent character' filter label fails WCAG AA contrast

**Area:** Trends  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2646-2650 (.tweaks-label var(--text-muted) 10px); used at Trends.tsx:100`

**Issue.** .tweaks-label is 10px uppercase weight-600 in --text-muted: 3.07:1 on --surface-1 #1e293b (telemetry), ~3.35:1 on the translucent .card (liquid) — below 4.5:1 AA for small text.

**Impact.** The label naming what the opponent pill row filters is hard to read for low-vision users and washes out on the dark glass.

**Fix.** Switch this label to var(--text-secondary) (#cbd5e1 = 9.85:1 on #1e293b). Reserve --text-muted for 14px+ non-essential text.

---

### M14. Win vs loss dots distinguished by color alone, with no non-color cue at 10px

**Area:** Sessions  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2313-2348; Sessions.tsx:65-78`

**Issue.** Win and loss dots are identical 10px circles separated only by hue (--win vs --loss). The only structural difference is the win dot's box-shadow glow, not a reliable shape/icon cue at 10px; the loss dot has no compensating treatment. Red-green is the most common color-vision confusion. (This is the Sessions/standalone-CSS facet of the broader color-only ResultDot issue; the shared component fix is in that finding.)

**Impact.** ~8% of male users cannot reliably read the W/L sequence at a glance — the card's primary scannable signal becomes noise.

**Fix.** Add a non-color differentiator in CSS: a filled circle for win vs a hollow/ringed circle for loss, or a small inner check vs dash. Implement once on the shared ResultDot.

---

### M15. Sessions card metadata (.session-card-sub / .session-card-opponents) fails WCAG AA contrast

**Area:** Sessions  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2796-2799 (.session-card-sub 12px), 2807-2810 (.session-card-opponents 11px), both var(--text-muted)`

**Issue.** --text-muted on the composited card surface computes to ~3.35:1 (telemetry calc; liquid ~3.6:1) — below 4.5:1 AA. Affects the 'N games ·' prefix and the entire 'vs Opponent…' line at 11px, worst over the brightest part of the watermark. The inline W/L numbers use --win/--loss and pass.

**Impact.** The opponent list and games count — context a player uses to recall a session — sit below the readability threshold.

**Fix.** Switch both to var(--text-secondary) and bump .session-card-opponents from 11px to 12px to align with the type scale.

---

### M16. Sessions per-game dot row becomes an unscannable band at high game counts

**Area:** Sessions  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:2801-2806 (.session-card-dots flex, 4px gap, wrap); 2313-2318 (.result-dot 10px); screenshots/_crop_card.png`

**Issue.** The row renders one 10px dot per game with flex-wrap and no cap, grouping, ordering cue, or count. In the 23-dot card the dots read as an undifferentiated red/green band — chronological order, streaks, and even the exact count are unreadable, and a long session dominates the card.

**Impact.** Defeats the visual's purpose: a player wants to spot win streaks / tilt runs across a session, but the row gives no readable sequence precisely at the counts where it matters.

**Fix.** Cap inline dots (show first ~16, then a '+N' chip) or render a single chronological win/loss bar, add a direction cue (oldest->newest), and optionally insert an extra gap every 5 dots for countability.

---

### M17. Oracle empty state is top-anchored, leaving most of the chat card empty below

**Area:** Oracle (chat)  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `screenshots/app-oracle.png; Oracle.tsx:64-70; components.css:616-621 (.empty-state padding 80px 24px), :3152-3158 (.oracle-scroll flex-direction:column)`

**Issue.** EmptyState renders as a normal block at the top of the flex-column .oracle-scroll. On the full-height card (height calc(100vh-80px)) the 'ASK THE ORACLE' heading and example line sit in the upper third; ~60% of the card below is empty gradient. It is not vertically centered.

**Impact.** The first-run/no-history view reads as unfinished — a small block of dim text floating above a large void — weakening the invitation to act and wasting the most valuable real estate.

**Fix.** When msgs.length===0 && !loading, center the empty state (e.g. .oracle-scroll--empty { justify-content:center } or wrap EmptyState in a flex:1 place-content:center div). Pair with the clickable-chips fix so the centered area carries actionable starters.

---

### M18. Oracle example-prompt and header-subtitle text fail WCAG AA contrast

**Area:** Oracle (chat)  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `components.css:647-651 (.empty-state-sub), :631-637 (.empty-state p, higher specificity wins at 12px); typography.css:38-45 (.page-header p)`

**Issue.** The example line resolves to --text-muted at 12px on --surface-1 = 3.07:1 (telemetry; ~3.6:1 liquid). The page-header subtitle is --text-muted at 10px on --bg = 3.75:1. Both fail 4.5:1 AA for normal text.

**Impact.** The primary call-to-action copy on the empty page is the hardest text to read — backwards for guiding a new user.

**Fix.** Set .empty-state-sub (and override .empty-state p) to var(--text-secondary); for .page-header p use var(--text-secondary) as well. If examples become chips, use proper button color tokens with a visible border.

---

### M19. Oracle response is non-streaming; only a static 'Thinking…' placeholder

**Area:** Oracle (chat)  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Oracle.tsx:34-41,79-86; src/main/handlers/llm.ts:257-272 (oracleAsk awaits single callLLM); src/llm.ts:209 (callLLMStream exists, used by analysis handlers)`

**Issue.** oracleAsk awaits one callLLM and appends the full message at once; the UI shows a fixed italic 'Thinking…' line for the entire 10-30s call. callLLMStream already exists and is used by the analysis/coaching handlers, but the Oracle path does not use it.

**Impact.** For a multi-paragraph answer the player stares at a static placeholder with no progress signal — it feels frozen, and it is inconsistent with the streaming CoachingModal.

**Fix.** Add an oracleAsk streaming IPC channel using callLLMStream that emits chunks (mirroring analysis.ts:122), appending tokens incrementally. At minimum animate the 'Thinking…' placeholder.

---

### M20. Oracle never surfaces what context/scope it is reasoning over

**Area:** Oracle (chat)  ·  **Category:** information-architecture  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/main/handlers/llm.ts:259-265 (buildOracleContext + last-20-turn trim); Oracle.tsx:52-56 (header)`

**Issue.** The handler builds server-side context and trims dialog to the last 20 turns, but the renderer surfaces none of it; the header only says 'Ask about any game, session, or pattern'. There is no indicator of which games/sessions/time-range the Oracle sees, nor that history is capped at 20 turns.

**Impact.** A player asking 'why am I losing to Fox lately?' cannot tell whether 'lately' means their last 5 games or their whole library, so they cannot calibrate or trust the answer — a credibility problem for a data-grounded tool.

**Fix.** Return what buildOracleContext includes (game count + earliest date) on the oracleAsk/list IPC response and render a small scope chip near the header or input, e.g. 'Context: last N games (since <date>)'. Drive it from real data.

---

### M21. Oracle input has no focus, placeholder, or disabled styling

**Area:** Oracle (chat)  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:3200-3209 (.oracle-input, resting only); Oracle.tsx:101 (disabled={loading})`

**Issue.** No .oracle-input:focus, ::placeholder, or :disabled rule exists, and there is no global input base rule. Sibling inputs each define their own focus/placeholder. When loading=true the input is disabled but gets no visual treatment, and there is no focus ring on the page's primary text field.

**Impact.** Keyboard users get no visible focus on the primary input; placeholder color is undefined; and during a request the disabled input looks identical to an editable one, so the user may keep typing into a dead field.

**Fix.** Add .oracle-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 2px rgba(var(--accent-rgb),0.08) } and .oracle-input:disabled { opacity:0.5; cursor:not-allowed }. For ::placeholder use var(--text-secondary) (muted/dim fail AA on surface-2).

---

### M22. Oracle error renders as a bare red paragraph outside the chat layout, with no retry and lost input

**Area:** Oracle (chat)  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Oracle.tsx:33 (setInput('') before await), :37-38 (catch), :87 (render)`

**Issue.** On failure the error renders as <p style={{color:'var(--loss)'}}>{err}</p> inside the scroll list, not inside an .oracle-row, so it lacks the avatar/body alignment of every other message and is left-flush. It is the raw error string with no retry or dismiss, and the typed text was already cleared at submit, so a failed question is lost.

**Impact.** LLM calls fail often (429, missing key, network), so this is a frequent path; the unstyled red line breaks the visual rhythm and forces the player to retype the whole question.

**Fix.** Render errors inside an .oracle-row with the assistant avatar and a styled error body; add a 'Retry' button that re-sends the last question; preserve the input on failure (don't clear until success, or restore in the catch).

---

### M23. Practice delete button has no danger styling; .btn-ghost is undefined repo-wide

**Area:** Practice  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Practice.tsx:157 (className='btn btn-ghost'); components.css:108-138 (.btn base), :169-176 (.btn-danger, unused here)`

**Issue.** .btn-ghost is defined nowhere in src/renderer/styles (zero matches), so the Delete button renders as the bare neutral .btn pill with no warning color, while a proper .btn-danger exists but is unused on this control. .btn-ghost is referenced in five places app-wide (Dashboard, Characters, Oracle, GameTheater) as a de-facto neutral button — a missing CSS class repo-wide — but on Practice it leaves the only destructive control unmarked.

**Impact.** The most dangerous control on the card carries no visual warning, raising accidental-deletion odds and breaking the convention that destructive actions read as red (as Settings does with btn-danger).

**Fix.** Change Practice.tsx:157 to className='btn btn-danger' (or add inline color: var(--loss)). Separately, define .btn-ghost in components.css (transparent background, var(--text-dim) text) since it is referenced in five places.

---

### M24. Single practice plan stretches to full content width, leaving a large empty void

**Area:** Practice  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `screenshots/app-practice.png; src/renderer/styles/components.css:3129-3133 (.practice-grid)`

**Issue.** .practice-grid is repeat(auto-fit, minmax(340px,1fr)) with no max-width on the card and no justify-content; .card has no max-width either. With a single plan, auto-fit collapses to one track and the lone card expands edge-to-edge, so short drill labels float against a wide empty right margin and the lower half of the viewport is blank.

**Impact.** The page reads as unfinished/unbalanced, wastes space, and spreads short drill labels far from their checkboxes, hurting scannability.

**Fix.** Add justify-content: start and cap the track, e.g. grid-template-columns: repeat(auto-fit, minmax(340px, 520px)), so a single plan renders at a natural card width.

---

### M25. Practice drill instruction text and progress counter use --text-muted, failing AA

**Area:** Practice  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Practice.tsx:124 ('drills complete', 12px), :152 (drill target, 11px); color var(--text-muted)`

**Issue.** The per-drill target instruction (11px) and the 'X/Y drills complete' counter (12px) use --text-muted: liquid #6a707b ≈ 3.61:1 on the card, telemetry/fallback #64748b on #1e293b = 3.07:1 — both below 4.5:1 AA. The drill target line is the actual instruction a player follows, so it is content.

**Impact.** The most instructionally useful text on the card is the hardest to read, especially the 11px target line.

**Fix.** Switch both to var(--text-secondary) (liquid #cfd4dc ≈ 12:1, telemetry #cbd5e1 = 9.85:1). Reserve --text-muted for large/decorative text.

---

### M26. Generating the first practice plan blanks the content region for the entire LLM round-trip

**Area:** Practice  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Practice.tsx:105-111 (ternary), :59-70 (onNewPlan), :98-100 (header button)`

**Issue.** The content branch is `plans.length===0 && !generating ? EmptyState : grid`. Clicking 'Generate First Plan' sets generating=true, so the else branch renders .practice-grid mapping over a still-empty plans array — i.e. nothing. The EmptyState vanishes and the content area is blank for the full 10-30s; the only feedback is the header button flipping to 'Generating…', at the top of the page away from the centered CTA.

**Impact.** After clicking the primary action the user sees an empty page with no feedback near where they were looking, making the app feel frozen or like the click failed; they may click again or navigate away.

**Fix.** Branch on `generating` before the empty/grid ternary to render a loading state in the content region (skeleton Card or centered spinner with 'MAGI is building your plan…').

---

### M27. Character detail hero stat labels use --text-muted at 10px — fails AA

**Area:** Characters  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:3028-3034 (.character-hero-stat-label 10px var(--text-muted)) on .character-hero-stat bg --surface-2 (:3009); same at .character-hero-stripe-label (:3059-3064)`

**Issue.** The flanking stat labels are 10px uppercase --text-muted on --surface-2: telemetry #64748b on #334155 = 2.18:1, liquid #6a707b over translucent surface-2 ≈ 3.0:1 — both well under 4.5:1 AA. .character-hero-stripe-label shares the identical color/size/background.

**Impact.** The labels that tell the user what each big mono stat means are the least readable element of the detail view, forcing guesswork about which number is which.

**Fix.** Raise both labels to var(--text-secondary) (or to 12px) so they clear 4.5:1.

---

### M28. Stock-timeline kill-move labels and stock numbers are 8-9px muted text far below AA

**Area:** Game Theater (replay player)  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:1297-1308 (.stock-segment-kill 8px --text-muted), 1280-1289 (.stock-segment-number 9px --text-muted opacity 0.6), 1314-1318 (.stock-kill-move max-width:40px ellipsis)`

**Issue.** Kill-move labels are 8px in --text-muted and stock numbers are 9px --text-muted at 0.6 opacity, sitting on tinted .stock-segment-fill (segment-color 0.12-0.55 alpha over #0a0d14). Computed contrast is ~1.8-2.2:1 for the kill labels over mid-intensity fills and ~1.4:1 for the 0.6-opacity numbers. The 40px max-width also ellipsis-truncates names even after shortKillMove().

**Impact.** The kill annotations that make the stock timeline informative are near-illegible, so the timeline degrades to bare colored bars and per-stock detail is lost on screen.

**Fix.** Raise to 10-11px and var(--text-secondary); remove the 0.6 opacity on .stock-segment-number; widen or drop the 40px max-width. (A hover title tooltip exists but is not a substitute for legible on-screen text.)

---

### M29. Stock-timeline segments are clickable divs with no keyboard access or focus style

**Area:** Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/components/StockTimeline.tsx:130-152; components.css:1262 (.stock-segment, no :focus)`

**Issue.** Each interactive segment is a <motion.div onClick={onStockClick} style={{cursor:pointer}}> with no role, tabIndex, or onKeyDown — unreachable by Tab and not activatable by Enter/Space — yet the onClick seeks the replay to that stock's start frame. There is no :focus or :focus-visible. By contrast Library rows add role/tabIndex/keydown.

**Impact.** Keyboard-only and screen-reader users cannot use the click-to-watch-this-stock feature; the timeline is interactive but invisible to assistive tech.

**Fix.** Make each segment a <button> (or add role='button' tabIndex={0} + onKeyDown for Enter/Space), give it an aria-label summarizing the stock (reuse the title string), and add .stock-segment:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }.

---

### M30. Embedded player has no scrubber, frame-step, or speed control

**Area:** Game Theater (replay player)  ·  **Category:** usability  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ReplayEmbed.tsx:274-310 (control bar)`

**Issue.** The control bar offers only Play/Pause, Restart, a hotkey tooltip, and Open Externally. Grep found no in-app timeline, frame-step, current/total-time readout, or slow-motion. The only seeking is indirect (clicking a stock-timeline segment or a coaching timestamp).

**Impact.** Frame-precise review (a tech-chase read, a missed L-cancel, a ledge option) is the central reason a player opens a replay; without scrub or frame-step in-app, serious review forces them out to 'Open Externally', undercutting the embed.

**Fix.** Add a seek bar bound to the embed's frame position plus prev/next-frame buttons (route a Dolphin frame-advance hotkey through embedReplaySendKey, or expose frame stepping via a new IPC). Even a coarse scrubber + time readout would close most of the gap.

---

### M31. Space key toggles pause AND scrolls the side column (no preventDefault)

**Area:** Game Theater (replay player)  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ReplayEmbed.tsx:169-185 (Space at :180, no preventDefault); replay-player.css:255-264 (.game-theater-side-col overflow-y:auto)`

**Issue.** The global keydown handler calls onTogglePause() on Space but never calls e.preventDefault(). The side column is overflow-y:auto, so when focus is in the side panel, pressing Space both pauses Dolphin AND page-scrolls the panel.

**Impact.** A user reading coaching who taps Space to pause unexpectedly jumps the scroll position; a user trying to scroll with Space accidentally pauses/unpauses the replay.

**Fix.** Call e.preventDefault() in the Space branch (it already early-returns for input/textarea/contentEditable, so reserving Space is safe). Apply the same fix to ReplayPlayer.tsx:184.

---

### M32. Settings replay folder/tag used for import + watch is never persisted (mixed save model)

**Area:** Settings  ·  **Category:** usability  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Settings.tsx:188-193 (handleBrowse), :195-241 (handleImport), :243-264 (toggleWatcher), :584 (Save button)`

**Issue.** Most fields persist only via the explicit Save Settings button, but theme/density autosave via TweaksPanel. handleBrowse, handleImport, and toggleWatcher all operate on in-memory config.replayFolder/targetPlayer without calling saveConfig. A user can browse to a folder, click Import All (which runs against in-memory state), and quit without pressing Save — losing the folder/tag on next launch even though import 'worked'. No cue distinguishes autosaved from manual-save fields.

**Impact.** Mixed autosave/manual-save with no indicator leads to lost configuration and a broken first-run setup: the import succeeded but the settings that enabled it vanish.

**Fix.** Persist replayFolder/targetPlayer as a side effect of a successful import or browse, OR add a dirty-state 'unsaved changes' indicator near Save. At minimum make the save model uniform across the page.

---

### M33. Native radio + .model-select are off-palette, and the model dropdown lacks the accent focus ring its sibling input has

**Area:** Settings  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Settings.tsx:481-486 (radio), :556-567 (select.model-select); components.css:546-550 (.settings-field input:focus), :567-580 (.model-select, no :focus)`

**Issue.** The active-provider radio is a bare <input type=radio> with no accent-color, so it renders as the default OS radio and is off-palette in crt/amber/light. Separately .model-select defines no :focus while .settings-field input:focus adds border-color+box-shadow; the Custom ID input IS a .settings-field input so it gets the ring — meaning toggling Dropdown<->Custom ID inconsistently gains/loses the accent focus on the same control.

**Impact.** Inconsistent visual language for the page's primary control across themes, and a jarring focus-style flip when switching the model input between modes.

**Fix.** Add input[type=radio]{accent-color:var(--accent)} and a .model-select:focus rule mirroring .settings-field input:focus.

---

### M34. Settings field labels and muted hints/links fail WCAG AA contrast in every theme

**Area:** Settings  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:523-532 (.settings-field label var(--text-muted) 9px), :559-566 (.import-status); Settings.tsx:497, :536 (inline --text-muted)`

**Issue.** Every field label is 9px in --text-muted, failing AA on each theme's card surface: telemetry 3.07:1, liquid 3.9:1, amber 3.64:1, crt 3.71:1, light 2.45:1. The 'get a key' link and model hint reuse the same color. NOTE: --text-dim is not a fix — applyTheme aliases it to textSecondary at runtime, so only the pre-JS tokens.css value #94a3b8 differs.

**Impact.** Form labels — which tell the user what each input does on a config screen — and muted hints are hard to read across all six themes.

**Fix.** Switch .settings-field label and the inline muted hints/links to var(--text-secondary) (telemetry #cbd5e1 = 9.85:1, liquid #cfd4dc passes everywhere). At 9px the labels will read less 'muted', but no AA-passing muted token exists on these surfaces.

---

### M35. .btn-danger white-on-red fails contrast on Clear All Games and Stop Watching

**Area:** Settings  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:169-173 (.btn-danger background var(--red), color #fff); used Settings.tsx:321,593`

**Issue.** .btn-danger puts #fff on --red (mapped to theme.loss). #fff fails AA for the 11px uppercase 600-weight label in every theme: telemetry #f87171 = 2.77:1, liquid #ff8a9e = 2.24:1, light #ef4444 = 3.76:1, amber 3.75:1, crt 3.64:1 — the page's only irreversible action.

**Impact.** The destructive-action button label is low-contrast precisely where clarity matters most.

**Fix.** Invert to a red outline/tint style (red border + var(--red) text on rgba(var(--red-rgb),0.08)) which tracks each theme's loss color. Avoid a fixed dark fill; verify >=4.5:1 in each theme.

---

### M36. Settings active-provider badges and 'configured' indicator hardcode green, washing out in Light theme

**Area:** Settings  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Settings.tsx:472,476,489 (active border/bg/label), :508 ('(configured)' color var(--green,#4caf50))`

**Issue.** The active-provider card tint at :476 is a literal rgba(74,222,128,0.04) (green) that ignores the theme, and the '(configured)' indicator falls back to #4caf50. The hardcoded green tint contradicts the theme accent (chrome/blue/amber), and on light surface #f8fafc, #4ade80 = 1.67:1 (invisible) and #4caf50 = 2.66:1.

**Impact.** The 'which provider is active' tint and the 'is my key set' signal are off-palette and wash out in Light theme — both communicate important state.

**Fix.** Replace the hardcoded green tint with rgba(var(--green-rgb),0.06) and the '(configured)' color with plain var(--green). For legibility on light, pair the indicator with a check glyph or use --text-secondary text plus a green dot.

---

### M37. Settings text-input labels are not programmatically associated with their inputs

**Area:** Settings  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Settings.tsx:287-292,295-300,397-403,418-424,506-515,533-540 (zero htmlFor/id)`

**Issue.** Every text-input <label> in Settings is bare with no htmlFor, and inputs have no id. Clicking a label does not focus its field and screen readers do not announce the association (WCAG 1.3.1 / 4.1.2). The radio labels are fine because the <label> wraps the input; this gap is the text/password/select fields.

**Impact.** Screen-reader users get unlabeled form fields on a config screen, and click-label-to-focus is missing for every text input.

**Fix.** Add matching id on each input and htmlFor on its label, or nest each input inside its <label> as the radios already do.

---

### M38. applyTheme collapses --secondary/--secondary-dim onto the accent, so 'indigo' coaching sections render as accent color

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/themes.ts:419-420; tokens.css:51-52; parseCoachingSections.ts:160,165,194`

**Issue.** tokens.css defines --secondary #818cf8 (indigo) and --secondary-dim #6366f1, but applyTheme sets --secondary to theme.accent and --secondary-dim to theme.accentHover (confirmed at themes.ts:419-420). The Theme interface has no secondary field, so at runtime --secondary always equals --accent. parseCoachingSections uses var(--secondary) for 'Defense & Recovery' and 'Statistical Analysis' and var(--secondary-dim) for 'Shield Pressure'.

**Impact.** Coaching section headers/icons meant to be a distinct indigo render identical to accent sections, erasing a deliberate color distinction in the most content-heavy view.

**Fix.** Add real secondary/secondaryDim fields to the Theme interface and set them in applyTheme (liquid keeps #818cf8/#6366f1). If indigo is deprecated, delete the tokens and repoint parseCoachingSections to an existing token (e.g. --chart-purple).

---

### M39. Entire --space-* scale (12 tokens) is defined but never referenced — the advertised 4px grid is unenforced

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** css

**Where:** `tokens.css:73-85 (--space-1 … --space-12); confirmed zero var(--space-*) usages across the renderer`

**Issue.** Grep for var(--space- across the entire renderer returns 0 hits; the 12 spacing tokens appear only at their own definitions. Every padding/margin/gap is a hardcoded px value, including off-grid one-offs in the compact-density block (14px, 18px, 10px).

**Impact.** The '4px base grid' comment provides no actual constraint, so spacing drifts off-grid and there is no single lever to retune density.

**Fix.** Either adopt the scale (replace hardcoded px with var(--space-N) in high-traffic rules) or delete tokens.css:74-85 so the scale stops masquerading as an enforced system. Reconcile the off-grid one-offs against the 4px steps.

---

### M40. .card:hover hardcodes a dark slate background, flashing dark on every card hover in light theme

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:58 (.card:hover background rgba(30,41,59,0.8))`

**Issue.** .card:hover sets background: rgba(30,41,59,0.8) — literal Slate-800 — instead of a token, and there are zero light-theme overrides for .card/.card:hover. The light theme redefines surfaces but this rule is theme-agnostic, so hovering any card under [data-theme=light] paints a dark slate panel over light content.

**Impact.** In light mode every card hover visibly inverts to a dark background — a jarring flash that breaks the theme and momentarily drops text contrast.

**Fix.** Replace the literal with a token, e.g. background: var(--surface-2) or rgba(var(--accent-rgb),0.06). (The accompanying box-shadow/border already use theme-aware tokens.)

---

### M41. Duplicate, conflicting .winrate-bar / .winrate-bar-fill blocks (legacy partially shadowed)

**Area:** Component library consistency  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:297-309 vs 2350-2363`

**Issue.** .winrate-bar and .winrate-bar-fill are each defined twice at identical specificity, so the later block wins per conflicting property (radius 0->999px, height 3->4px, transition 0.5s->0.4s). The legacy block is not fully dead: line 298 sets width:88px and line 2351 sets flex:1 (different properties), so in a non-flex parent (Practice.tsx:131) width:88px governs while inside a flex row (Characters.tsx:575) flex:1 moots it. Every bar renders pill-shaped (999px) regardless, which contradicts the system's sharp-corner radii.

**Impact.** A maintainer editing the legacy block sees no effect on radius/height/transition, and width behaves inconsistently across pages; the 999px pill is the outlier among token-driven radii.

**Fix.** Delete the legacy block at 297-309, keep one definition (the 2350 block), set an explicit width/flex so it is deterministic across parents, and decide intentionally between pill and --radius-xs/sm.

---

### M42. Card vs KPI container primitives diverge on radius, background token, shadow, and hover

**Area:** Component library consistency  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:41-63 (.card) vs 2184-2191 (.kpi); Card.tsx, KPI.tsx, StatGroupCard.tsx`

**Issue.** .card uses radius-sm, a hardcoded rgba(30,41,59,0.6) (== --surface-1 at 60%, so a token change won't propagate), shadow-sm, blur, and a translateY(-3px) hover lift; .kpi uses radius-md, var(--surface-1), no shadow, no hover. StatGroupCard wraps Card for a third visual weight. No shared surface base class exists.

**Impact.** Cards and KPI tiles side-by-side on the Dashboard have mismatched radii (4px vs 6px) and KPIs sit flat while Cards float/lift, reading as two design systems; the hardcoded rgba bypasses the token so theme changes skip Cards.

**Fix.** Introduce a shared surface utility or CSS custom props (--card-radius, --surface-translucent) consumed by both; pick one container radius; replace .card's hardcoded rgba with color-mix(in srgb, var(--surface-1) 60%, transparent) or a --surface-1-translucent token.

---

### M43. Page-level pseudo-cards re-implement the Card surface inconsistently (divergent background tokens)

**Area:** Component library consistency  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:1022-1028 (.sig-stat), 951-962 (.char-hero-card), 1102-1112 (.profile-record-card), 1124-1130 (.profile-radar-card)`

**Issue.** Four standalone classes each hand-roll the same surface recipe rather than reusing the Card primitive, and they diverge on background token: .sig-stat uses var(--bg) while the others use var(--surface-1), and the Card primitive itself uses translucent rgba+blur — at least three different 'card' background treatments for one visual role.

**Impact.** Card visual weight is inconsistent between Characters/Profile and the rest of the app, and any future surface change must be made in 4+ places.

**Fix.** Route these through a shared .surface utility or shared surface tokens (not wholesale Card, which adds an unwanted hover lift to dense grids), standardize the background on var(--surface-1), and change .sig-stat from var(--bg) to var(--surface-1).

---

### M44. focus-visible is applied inconsistently across the secondary-control cluster

**Area:** Dynamic & interaction states  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `Present: components.css:131 (.btn), :291 (.tab), :825 (.char-card), :35 (.result-dot-button), layout.css:98 (.nav-item). Absent: .pill (:2255), .tweaks-chip (:2659), .tweaks-toggle-btn (:2576), .mode-btn (:591), .radar-period-btn (:2142), .char-back-btn (:910)`

**Issue.** reset.css has no outline reset, so the unstyled elements still get the browser default ring and ARE keyboard-reachable — the issue is purely consistency: .btn/.tab/.char-card/.result-dot-button/.nav-item use the branded accent ring while .pill, .tweaks-chip, .tweaks-toggle-btn, .mode-btn, .radar-period-btn and .char-back-btn fall back to the platform ring.

**Impact.** Keyboard focus visually jumps between two languages as the user tabs — branded ring on buttons/tabs/nav, generic OS ring on pills, chips, the gear, the mode toggle, the radar period selector and the back button.

**Fix.** Add the shared focus ring (outline: 2px solid var(--accent); outline-offset: 2px) to .pill, .tweaks-chip, .tweaks-toggle-btn, .mode-btn, .radar-period-btn and .char-back-btn.

---

### M45. Two text inputs (model select, Oracle chat) have no focus style, and Library filter uses a weaker one

**Area:** Dynamic & interaction states  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:567-580 (.model-select, no :focus), :3200-3209 (.oracle-input, no :focus); compare :546 (.settings-field input:focus), :1626 (.sessions-search-input:focus), :2700 (.library-filter-input:focus)`

**Issue.** .settings-field input:focus and .sessions-search-input:focus both set border-color var(--accent) + box-shadow. But .model-select and .oracle-input define no :focus, keeping the bare UA ring, and .library-filter-input:focus sets outline:none and only changes border-color, omitting the box-shadow — so focus produces three different results across the app.

**Impact.** Focusing an input gives a branded ring+glow on Settings/Sessions fields, a bare OS ring on the model dropdown and Oracle box, and a weaker border-only highlight in Library.

**Fix.** Give .model-select and .oracle-input the .settings-field input:focus rule, and add the box-shadow to .library-filter-input:focus so all five inputs share one treatment.

---

### M46. The floating gear (Tweaks) button has no :hover or :active feedback

**Area:** Dynamic & interaction states  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2576-2599 (.tweaks-toggle-btn, base + liquid variant only); TweaksPanel.tsx:27`

**Issue.** .tweaks-toggle-btn defines only a base and a liquid variant — no :hover and no :active. It is the one persistent fixed-position control (bottom-right, z-index 999) yet gives zero pointer feedback on hover and no press feedback on click, unlike .btn which has both.

**Impact.** The single always-on global control feels dead on hover/press, undercutting the polished interaction language every other button has.

**Fix.** Add .tweaks-toggle-btn:hover (background var(--surface-3), subtle accent glow) and .tweaks-toggle-btn:active { transform: scale(0.96) }, mirroring .btn.

---

### M47. Collapsible coaching section toggles have no keyboard focus indicator

**Area:** Coaching display  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/coaching-cards.css:40-42 (.cc-card-header:hover only); CoachingCards.tsx:89 (real <button>)`

**Issue.** .cc-card-header is a real <button aria-expanded> and the only way to expand/collapse sections, but coaching-cards.css defines :hover and no :focus/:focus-visible. Every other interactive element ships a focus ring; the coaching toggles are the lone exception.

**Impact.** Keyboard and screen-magnifier users lose track of which section is focused while navigating coaching cards.

**Fix.** Add .cc-card-header:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px } (negative offset because .cc-card has overflow:hidden).

---

### M48. Timestamp jump-to-moment links have no keyboard focus state

**Area:** Coaching display  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/utils/timestampLinks.tsx:53-67 (span role='button' tabIndex={0}); components.css:1177 (:hover), :1183 (:active), no :focus-visible`

**Issue.** Timestamp links are <span role='button' tabIndex={0}> with an Enter/Space handler — fully keyboard-operable — but .timestamp-link defines :hover and :active and no :focus-visible. Keyboard users tabbing through coaching text get no indication of which timestamp is focused before pressing Enter to seek the replay.

**Impact.** The signature jump-to-moment feature is effectively keyboard-invisible: the focused link gives no cue, so the user can't tell which moment they're about to open.

**Fix.** Add .timestamp-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px } (or reuse the existing hover box-shadow ring for :focus-visible).

---

### M49. Collapsed coaching-card summary derives from a naive first-sentence regex — malformed on list-first LLM output

**Area:** Coaching display  ·  **Category:** content  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/components/CoachingCards.tsx:74-79`

**Issue.** The collapsed summary strips ** and newlines then matches ^(.+?[.!?]); with no terminator it falls back to a raw text.slice(0,140). prompt.ts instructs the LLM to emit list-heavy sections (Practice Plan bullets, Specific Recommendations), so a section beginning with a '- ' bullet, bolded stat, or heading yields a run-on with stray bullet/dash characters on one line — and these structured sections are exactly the ones a collapsed user only sees the summary of.

**Impact.** The scannable summary — the whole point of collapsing — is often a malformed run-on for the structured sections, defeating the collapse-to-scan interaction.

**Fix.** Before the regex, normalize list markers (strip leading -/*/digit. per line, join with '; ') and prefer the first list item or first non-empty line when no [.!?] terminator is found, instead of a raw 140-char slice.

---

### M50. Toggle Pills don't expose pressed/selected state to assistive tech

**Area:** Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/Pill.tsx:8-13; Library.tsx:111-117; components.css:2255-2287`

**Issue.** Pill is a real <button type='button'> (keyboard operable) but reflects selection only via an 'active' class — it never sets aria-pressed/aria-selected, so a screen reader can't tell which result filter (all/win/loss) is active. (The missing :focus-visible ring is covered by the focus-consistency finding.)

**Impact.** Blind users operating the filter toggles get no feedback about the current selection.

**Fix.** Add aria-pressed={!!active} to the Pill button (or role='radio'/aria-checked if it is a single-select group like all/win/loss).

---

### M51. MAGI Oracle is grouped under 'System' rather than 'Analyze'

**Area:** Navigation, IA & window behavior  ·  **Category:** information-architecture  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/App.tsx:47-50 (SYSTEM_ITEMS = [oracle, settings]); screenshots/app-oracle.png`

**Issue.** Oracle is an AI chat for interrogating your games/matchups — an analysis tool — yet sits in SYSTEM_ITEMS next to Settings, while Practice (also LLM-generated) lives in ANALYZE_ITEMS. The split puts two AI/analysis features in two sections by no clear rule.

**Impact.** Users scanning the 'Analyze' group for ways to interrogate their data will miss Oracle, the app's most direct analysis-by-conversation feature.

**Fix.** Move the oracle entry to the END of ANALYZE_ITEMS (after practice), leaving SYSTEM_ITEMS = [settings]. No CommandPalette change needed (its Ctrl+number array is a flat list, and the rail order is unchanged so oracle stays Ctrl+7).

---

### M52. Motion eases/springs are hardcoded in JS instead of the --ease-spring / --ease-out tokens

**Area:** Motion & micro-interactions  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `Tokens: tokens.css:116-117. JS bypassing them: LiquidShell.tsx:50,83,113; CommandPalette.tsx:438,449,523-524; ReplayPlayer.tsx:228; CoachingCards.tsx:87,117; StockTimeline.tsx:138; Dashboard.tsx:158,166,311; Card.tsx:19`

**Issue.** tokens.css defines the motion source-of-truth and 15+ CSS rules consume it, but the JS layer ignores both: the element ease is hardcoded [0.22,1,0.36,1] in several components (matching neither --ease-out nor --ease-spring), ReplayPlayer uses a third curve [0.2,0.8,0.2,1], CommandPalette overlay uses a bare duration:0.15, and the spring family is ad-hoc (stiffness 200/400/500, bounce 0.4/0.2). There is no shared TS spring/ease constant.

**Impact.** The 'feel' drifts per surface — nav pill, command-palette highlight and the various card/KPI springs settle at different rates — and a future tweak in tokens.css changes nothing in the JS-driven UI.

**Fix.** Add a shared TS motion module (EASE_OUT matching tokens.css:117, SPRING_PANEL, SPRING_NAV) and import it into every framer transition; collapse the bounce/stiffness variants to one panel spring + one nav-pill spring; align the JS bezier with --ease-out.

---

### M53. Route shell and each page both animate the same fade-up entrance, with mismatched durations

**Area:** Motion & micro-interactions  ·  **Category:** motion  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/LiquidShell.tsx:107-118 (AnimatePresence, duration 0.15); Dashboard.tsx:123 (0.25); GameTheater.tsx:117-121 (0.3); Trends.tsx:83 (0.2); Characters.tsx:381 (0.2)`

**Issue.** LiquidShell wraps the active route in a motion.div keyed on pathname that fades opacity 0->1 / y 6->0 over 0.15s on every navigation. Each page's own root is ALSO a motion.div with the same entrance but a longer, inconsistent duration. So one navigation plays two overlapping fade-ups on the same content, and with AnimatePresence mode='wait' the old page's exit also delays the new double-entrance.

**Impact.** Navigation feels heavier/slower than the 0.15s shell implies; content appears to 'settle twice' and the snappy shell transition is defeated.

**Fix.** Own the page transition in one place: keep the LiquidShell AnimatePresence wrapper and convert the per-page root motion.divs back to plain divs (Dashboard/GameTheater/Trends/Characters). Reserve inner motion for genuinely staggered child content like the KPI grid.

---

### M54. Dashboard primary grids never reflow below the 900px minimum window width

**Area:** Navigation, IA & window behavior  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/dashboard.css:11-16 (.dash-split 2fr 1fr), :29-33 (.dash-spark-grid repeat(3,1fr)); src/main/index.ts:97 (window minWidth 900); tokens.css:120 (--rail-width 220px)`

**Issue.** .dash-split is a hard 2fr/1fr and .dash-spark-grid a hard 3-column grid with NO breakpoint; the only media queries target .character-hero-stage. At the allowed minimum window (900px − 220px rail − padding ≈ 600px usable) the 1fr right column shrinks to ~200px for the multi-paragraph Oracle block and the three sparkline cells get cramped. .kpi-grid uses auto-fit and reflows correctly.

**Impact.** At small-but-valid window sizes the Oracle summary wraps into a tall narrow column and the sparklines become hard to read — a degraded experience the min-width guard does not prevent.

**Fix.** Add @media (max-width:1100px) collapsing .dash-split to 1fr and .dash-spark-grid to repeat(auto-fit, minmax(160px,1fr)), mirroring .kpi-grid.

---

### M55. Hardcoded character-name palette was never contrast-checked — saturated/dark names fail AA on the card surface

**Area:** Characters  ·  **Category:** accessibility  ·  **Effort:** 🏗️ structural  ·  **Evidence:** css

**Where:** `src/renderer/pages/Characters.tsx:87-113 (CHARACTER_META colors) applied as inline color at .character-tile-name (components.css:2906, 15px/700) over --surface-1`

**Issue.** .character-tile-name is 15px bold = 11.25pt, below the WCAG large-text cutoff, so AA needs 4.5:1. Against telemetry --surface-1 #1e293b: DK #92400e = 2.06:1, Ganon #7c3aed = 2.57:1, Roy #dc2626 = 3.03:1, Sheik #8b5cf6 = 3.45:1, Mario/Ness #ef4444 = 3.89:1, Falco #4a7cff = 3.91:1 — all fail. The liquid translucent surface keeps them in the same failing range. The palette is a literal hex map picked for franchise flavor, not legibility.

**Impact.** The character name is the primary identifier on each tile; dark/saturated names (worst: DK, Ganon) are hard to read, weakening fast roster scanning.

**Fix.** Treat the name as small text (4.5:1): move it to --text and demote meta.color to a non-text accent, or clamp every meta.color used as text to >=4.5:1 against the resolved --surface-1 (lighten DK/Ganon/Sheik/Roy). Apply the same clamp to the detail-view name.

---

## 🔵 Low (29)

### L1. KPI metric labels render at 10px with sub-AA muted color (no liquid override)

**Area:** Dashboard  ·  **Category:** content  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2192-2198 (.kpi-label font-size:10px, color --text-muted, letter-spacing 0.12em)`

**Issue.** .kpi-label is 10px uppercase, 0.12em tracking, in --text-muted (3.07:1 telemetry / ~3.6:1 liquid), with no liquid override. 10px tracked uppercase is near the lower readability bound and compounds the contrast deficit. (Color is also covered by the KPI cluster; this captures the size facet.)

**Impact.** The labels that tell the player WHAT each number means are the least legible part of the most-glanced widget.

**Fix.** Bump .kpi-label to 11-12px and change to var(--text-secondary) while keeping the uppercase/tracking treatment.

---

### L2. Library numeric stat headers rely on ellipsis under fixed layout and clip at narrow widths

**Area:** Library  ·  **Category:** content  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/styles/components.css:219-221 (th nowrap/overflow/ellipsis), :206 (table-layout:fixed); Library.tsx:131-133 (Neutral, L-Cancel, Dmg/Op)`

**Issue.** th cells have nowrap + overflow:hidden + ellipsis under table-layout:fixed, so when a narrow window squeezes the equal-width columns, multi-word headers like 'L-Cancel' and 'Dmg/Op' truncate with no tooltip. The header row already shows tight labels on the right columns.

**Impact.** A truncated stat header leaves the player guessing what a numeric column means, especially at smaller window widths.

**Fix.** After fixing column widths, give numeric columns enough width for their labels and add a title attribute (or <abbr>) on each th for the full label on hover.

---

### L3. Trends gridlines are unlabeled and near-invisible at 5% opacity

**Area:** Trends  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/Sparkline.tsx:45,68-71; tokens.css:26 (--border-subtle rgba(148,163,184,0.05))`

**Issue.** Three dashed gridlines are drawn at fixed 25/50/75% of box height with stroke --border-subtle (5% opacity, effectively invisible) — they carry no labels and, due to auto-scaling, map to no fixed value.

**Impact.** The gridlines add render cost without giving either visual structure or a quantitative reference.

**Fix.** Tie the three lines to real y-domain values (after the domain-anchoring fix) and bump the stroke to var(--border) or --border-muted so they are perceivable, then label them — or remove them.

---

### L4. Trends has no error state, and sparse-filter results show a silent blank chart

**Area:** Trends  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Trends.tsx:71,78-80,120,140-146; Sparkline.tsx:41`

**Issue.** useTrendSeries is destructured as { data, isLoading } only — no isError branch. The page handles only recent.length===0 -> EmptyState and isLoading -> spinner. When a filter returns fewer games than the rolling window, series is short/empty: Sparkline returns null (blank plot) and the KPI shows '—', but because recent.length!==0 the friendly EmptyState never fires.

**Impact.** A failed getTrendSeries leaves a permanently blank chart with no explanation, and filtering to a rarely-played matchup yields a confusing empty panel with a dash instead of guidance.

**Fix.** Destructure isError and add an error fallback; add a per-chart low-sample message ('Need 5+ games for a trend — only N found for this filter') in place of the silent null/'—'.

---

### L5. Result column header is empty and the dot column has no real header

**Area:** Library  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Library.tsx:126 (empty <th></th>)`

**Issue.** The win/loss dot column has an empty <th></th> header. (The color-only encoding and the missing result in the row aria-label are merged into the ResultDot finding; this captures the empty header label specifically.)

**Impact.** The column conveying the single most important field per row has no header label.

**Fix.** Give the column a real header like 'Res' at Library.tsx:126.

---

### L6. Sessions winrate bar is unlabeled, non-semantic, and reads like a divider in the liquid theme

**Area:** Sessions  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/WinrateBar.tsx:1-8; components.css:2350-2370; Sessions.tsx:57-59; screenshots/_crop_card.png`

**Issue.** WinrateBar renders a bare div fill with no role/aria/label and duplicates the win% already shown top-right. In the liquid theme the fill is a near-white gradient on a --surface-3 track at 6px height; at low win-rates the short white nub reads as a hairline divider rather than a meter.

**Impact.** Adds visual weight without scannable information and is easy to misread as a separator line.

**Fix.** Either drop the bar (win% is already shown), or make it meaningful: remove the liquid override so it falls back to the accent fill for an unambiguous filled-vs-empty read, and add role='progressbar' with aria-valuenow/min/max + aria-label.

---

### L7. Session report renders inline and unconstrained, breaking grid alignment; error uses ad-hoc inline styles

**Area:** Sessions  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Sessions.tsx:87-92; components.css:2812-2820 (.session-card-report, no max-height/overflow)`

**Issue.** On error the message is an inline <p> with hardcoded styles (color var(--loss), fontSize 12) instead of a shared alert class. On success the full LLM report is injected via <Markdown> into .session-card-report, which has no max-height/overflow and can grow arbitrarily; in the sessions-grid rows do not equalize height, so one tall report card leaves its neighbor ragged.

**Impact.** Inconsistent with the app's component conventions, and a long report balloons one card while its neighbor stays short, creating uneven grid alignment.

**Fix.** Constrain .session-card-report with max-height (~240px) + overflow:auto, or render the report in the existing CoachingModal/GameDrawer surface; replace the inline-styled error <p> with a shared inline-alert class.

---

### L8. WinrateBar fill is a flat color regardless of value — encodes no win/loss, duplicating colored W-L text

**Area:** Characters  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/WinrateBar.tsx:1-8; components.css:2358-2360 (base var(--accent)), 2367-2369 (liquid gradient); used Characters.tsx:425,575 and Sessions`

**Issue.** WinrateBar only sets width by value; its color is fixed. In the liquid theme the fill is the chrome gradient (and --accent there is #c7ccd6, not cyan), so a 20% and an 80% win rate look identical except for length on a 3-6px bar. The matchup table colors its percentage by outcome and the tile already shows colored W-L, so the bar is a redundant, semantically blank cue. (The 88px-width symptom and the duplicate-CSS-blocks issue are tracked separately.)

**Impact.** The bar adds visual weight without the red/green meaning the colored record already conveys; a player skimming for strong/weak characters gets nothing extra from it.

**Fix.** Pass a value-derived color into .winrate-bar-fill via an inline style (inline beats the liquid override): var(--win) for value>=0.5, var(--loss) below. Accept an optional color/threshold prop so callers can reuse it.

---

### L9. Tall 3:4 character tiles at 220px min make the 26-tile grid low-density and force heavy scrolling

**Area:** Characters  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** screenshot

**Where:** `screenshots/app-characters.png; components.css:2826 (.characters-grid minmax(220px,1fr)), :2840 (.character-tile aspect-ratio 3/4); layout.css:136 (.main-content overflow-y:auto)`

**Issue.** A 220px min column with a forced 3/4 aspect ratio makes each tile ~293px tall, so only ~1.8 rows of 26 fit before the fold; the screenshot shows the second row cut mid-card. The wireframe art takes ~75% of each tile while the actionable strip (name/record/bar) is a thin bottom band.

**Impact.** Comparing characters means substantial scrolling, and the art-to-data ratio favors decoration over the records a player came to read.

**Fix.** Set .character-tile aspect-ratio 3/4 -> 4/5 and/or drop .characters-grid minmax(220px) -> minmax(180px). Optionally add a compact list/table view toggle.

---

### L10. Plan progress bar reuses the 88px-wide WinrateBar — too short to read as plan completion

**Area:** Practice  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Practice.tsx:130-132; components.css:297-303 and 2350-2370 (colliding .winrate-bar rules)`

**Issue.** Progress uses the shared WinrateBar. Because of the two colliding rules, width:88px survives (only rule 297 sets width) while height/radius come from the later block; the bar's flex:1 is inert in the plain-div parent, so an ~88px sliver holds. In the liquid theme the fill is a silver gradient with no semantic 'progress' color, reading like a divider rather than a completion meter.

**Impact.** Plan completion — the page's core feedback loop — is easy to miss; a fixed 88px sliver doesn't communicate '1 of 4 done' at a glance and competes with the textual 'N/N drills complete'.

**Fix.** Give plan progress a dedicated full-width style (height 6-8px) with a semantic fill (var(--accent) or var(--win)) via a .practice-progress class, instead of relying on the colliding WinrateBar rules.

---

### L11. Pause/Play icon state is optimistic and can desync from Dolphin

**Area:** Game Theater (replay player)  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/components/ReplayEmbed.tsx:187-191,282; same pattern in ReplayPlayer.tsx:190-194`

**Issue.** onTogglePause flips local isPaused and sends VK_SPACE with no confirmation from Dolphin. Grep confirms no onEmbedReplayPaused IPC event, so actual state never reaches the renderer. If playback is paused/resumed by any other route (replay end, external hotkey, dropped key send), the button icon no longer reflects actual state.

**Impact.** The play/pause button can show Play while the replay is running (or vice versa), so the primary transport control can misrepresent its own state.

**Fix.** Have the main process report actual play/pause state over a new onEmbedReplayPaused IPC event (wired through ipc.ts + preload + global.d.ts) and drive the icon from that instead of optimistic local toggling.

---

### L12. StockTimeline silently renders nothing on error, with no indication it exists

**Area:** Game Theater (replay player)  ·  **Category:** content  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/components/StockTimeline.tsx:238-240`

**Issue.** On any fetch error or null data the component returns null ('Silently fail — the timeline is supplementary'). When getStockTimeline fails (corrupt/unusual .slp) the side column jumps straight to the Performance card, with no hint a stock-timeline feature was supposed to appear or that it failed.

**Impact.** The player has no idea the click-to-seek timeline (a primary in-app seek affordance) exists or that something went wrong — the page just looks like it has fewer features.

**Fix.** Render a compact, low-emphasis fallback ('Stock timeline unavailable for this replay') instead of returning null. Keep it subtle to honor the 'supplementary' intent.

---

### L13. Stat group titles (Performance / Defense / Offense) also below AA contrast

**Area:** Game Theater (replay player)  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:68-76 (.card-title 9px, --text-muted); rendered via Card.tsx:22`

**Issue.** The 9px uppercase card titles use --text-muted on the card surface; depending on where the card floats over the gradient, contrast computes ~3.1:1 to ~3.7:1 — below 4.5:1 AA. These three group titles are the only grouping cue separating Performance / Defense / Offense.

**Impact.** A player skimming for 'how was my defense' can barely read the group heading separating the three stat blocks, weakening the only grouping cue.

**Fix.** Use var(--text-secondary) for .card-title or raise font-size above 9px. (Same root cause as the systemic --text-muted theme.)

---

### L14. No way to verify an API key; fetchModels swallows errors so a bad key is indistinguishable from a hiccup

**Area:** Settings  ·  **Category:** interaction-states  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Settings.tsx:103-113 (catch { setDynamicModels(null) }), :460-466 (ready flag checks key presence only), :510-515 (password input)`

**Issue.** The key input is correctly type=password and write-only, but the only feedback that a key works is whether Refresh returns a non-empty list, and fetchModels swallows all errors into catch { setDynamicModels(null) }, nulling EVERY provider's models on a single failure. A wrong key, a network hiccup, and an unconfigured provider are indistinguishable; there is no per-provider test or error surface.

**Impact.** A user who pastes a wrong key gets no signal until coaching silently fails elsewhere; troubleshooting is guesswork.

**Fix.** Surface fetchAllModels failures instead of silently nulling (a small error line on the provider block), and add a per-provider 'Test key' action that pings the provider and shows pass/fail.

---

### L15. Primary Save Settings button is an unanchored bare button between two cards

**Area:** Settings  ·  **Category:** layout  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Settings.tsx:584-586 (bare <button> between AI Provider </Card> and Danger Zone <Card> at :588)`

**Issue.** The page's primary commit action is a bare <button className='btn btn-primary'> with no wrapping container, footer, or sticky positioning, floating structurally between the AI Provider card and the red Danger Zone card.

**Impact.** On a long scrolling form the primary CTA has no anchoring and sits adjacent to the destructive Danger Zone.

**Fix.** Wrap Save in a bordered footer row or sticky bottom bar with clear separation from the Danger Zone, and ideally enable/disable it from a dirty-state flag so it doubles as an unsaved-changes cue.

---

### L16. Game Theater 'Back' relies solely on browser history, with no parent fallback or breadcrumb

**Area:** Navigation, IA & window behavior  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/GameTheater.tsx:135 (navigate(-1)); same at :83 and :103`

**Issue.** All three Back affordances call navigate(-1) with no window.history.length guard and no fallback route. If a user lands on /game/:id via deep link, refresh, or a shallow history stack, navigate(-1) can go nowhere meaningful. There is also no breadcrumb indicating the parent.

**Impact.** Back behavior is non-deterministic by entry path, and the user has no spatial cue for where they came from — minor disorientation in the one deep, full-screen page.

**Fix.** Guard the fallback: navigate(-1) only when window.history.length > 1, else navigate('/library'). Optionally add a small breadcrumb in game-theater-side-head reusing game.playerCharacter/opponentCharacter.

---

### L17. No content max-width: layout stretches edge-to-edge on ultrawide windows

**Area:** Navigation, IA & window behavior  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/layout.css:134-142 (.main-content flex:1, padding 28px 40px, no max-width)`

**Issue.** .main-content has no max-width and no inner content-width cap (grep shows max-width only on tooltips/badges/menus). On a maximized ultrawide window the text-heavy panels (.dash-oracle-body, .oracle-body, CoachingCards prose) stretch to very long line lengths and auto-fit grids keep adding columns.

**Impact.** Long measures (>120 chars) hurt readability of coaching/summary prose; the fixed 2fr/1fr split exaggerates the problem on very wide displays.

**Fix.** Cap readable content with a max-width on an inner wrapper inside .main-content (e.g. max-width:1600px; margin-inline:auto), or at minimum constrain the prose panels to ~75ch.

---

### L18. Tweaks density/color chips lack :hover feedback

**Area:** Dynamic & interaction states  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2659-2687 (.tweaks-chip / .tweaks-chip.active); TweaksPanel.tsx:60,73`

**Issue.** .tweaks-chip has only base and .active styles plus liquid variants — no :hover (compare .pill which has .pill:hover). Inactive chips give no pointer feedback before selection, so they read as static labels rather than toggle buttons.

**Impact.** Inside the tweaks dialog, color-mode and density chips look inert until clicked, breaking the affordance that they are interactive toggles.

**Fix.** Add .tweaks-chip:hover { background: var(--surface-3); color: var(--text) } to match .pill:hover.

---

### L19. Recent-games table rows animate a JS hover scale + redundant backgroundColor over existing CSS hover

**Area:** Motion & micro-interactions  ·  **Category:** interaction-states  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/pages/Dashboard.tsx:307-324 (motion.tr whileHover scale 1.01 + backgroundColor); components.css:241-257 (CSS hover already sets surface-2 + ::after sweep)`

**Issue.** Each motion.tr uses whileHover scale 1.01 (originX:0) AND animates backgroundColor to var(--surface-2) in JS, but the table already sets the SAME background on row hover plus a ::after gradient sweep. So the JS color tween is fully redundant, and the 1% scale applies a transform to mono-spaced numeric cells, causing sub-pixel text re-rasterization (slight blur/jitter) on hover.

**Impact.** On hover the numbers go slightly soft; the transform + JS color tween duplicate crisp CSS work and can micro-stutter on mid-tier hardware while the 1% scale is barely perceptible.

**Fix.** Remove the whileHover prop from the motion.tr entirely; the existing CSS hover provides GPU-cheap crisp feedback with no text reflow. Keep the row's entrance variant.

---

### L20. Active nav item shows two competing indicators (sliding pill animates, static left bar teleports)

**Area:** Motion & micro-interactions  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/LiquidShell.tsx:46-60 (motion.div layoutId pill, spring 400/30); layout.css:86-96 (.nav-item.active::before static 2px accent bar)`

**Issue.** The active item renders both the framer layoutId pill that springs between items AND a CSS static 2px accent left bar that just pops in/out with the class toggle (no transition). Both appear simultaneously; only the pill moves on navigation.

**Impact.** Two simultaneous active treatments dilute the signal: the pill glides smoothly while the left bar teleports — a small but repeatable inconsistency on every nav change.

**Fix.** Pick one: drive the accent bar with its own layoutId so it travels with the pill, or remove .nav-item.active::before and rely on the pill plus the active text color.

---

### L21. Result-only colored dot has no text or accessible label (Library)

**Area:** Library  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/ResultDot.tsx:3-4; Library.tsx:173`

**Issue.** ResultDot passes through props but Library supplies no aria-label at line 173, so the bare span has no accessible name. (This is the Library-specific aria facet; the cross-cutting color-only + row-aria fix is in the merged ResultDot finding — kept here only as the precise per-line callout.)

**Impact.** Outcome is conveyed by hue alone and is unannounced to assistive tech at this specific call site.

**Fix.** Pass aria-label={result} (or a visually-hidden 'W'/'L') to ResultDot at Library.tsx:173 (preferably via the visually-hidden span baked into the component).

---

### L22. Clearing Oracle history uses the native browser confirm() dialog

**Area:** Oracle (chat)  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** tsx

**Where:** `src/renderer/pages/Oracle.tsx:44-48 (confirm('Clear Oracle conversation history?'))`

**Issue.** clear() calls window.confirm(), which renders the OS/Electron-default modal — system-themed, without the app's dark liquid-glass styling or typography.

**Impact.** A jarring break from the app's visual language for a destructive action; the native dialog can't be styled or made keyboard-consistent. Minor because it is low-frequency and intentional.

**Fix.** Replace with an in-app confirmation modal consistent with the theme (the codebase already has a styled modal pattern). Style the destructive 'Clear' with the --loss tone.

---

### L23. Coaching section heading forced to a single ellipsized line clips informative labels in narrow surfaces

**Area:** Coaching display  ·  **Category:** layout  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/coaching-cards.css:71-80 (.cc-card-heading nowrap/overflow/ellipsis)`

**Issue.** Section headings come straight from the LLM and .cc-card-heading forces a single line with ellipsis. In the CoachingPanel side column (min(520px,38vw)) or the 540px modal, a long heading like 'Biggest Improvement Opportunity' gets clipped after the icon + chevron consume horizontal space, hiding the descriptive tail.

**Impact.** Users scanning collapsed cards lose the most informative part of longer headings, weakening at-a-glance navigation in the narrowest coaching surfaces.

**Fix.** Replace nowrap/ellipsis with the 2-line clamp the summary already uses (display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden).

---

### L24. Shield Pressure coaching section label color fails WCAG AA at 10px

**Area:** Coaching display  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/utils/parseCoachingSections.ts:165 (shield-pressure color var(--secondary-dim)) -> .cc-card-label (coaching-cards.css:60-69, 10px)`

**Issue.** .cc-card-label is 10px uppercase (AA needs 4.5:1) and inherits --cc-accent from the section's meta.color. Shield-pressure uses --secondary-dim #6366f1, which on --surface-1 #1e293b = 3.27:1 — fails. Sibling labels pass (defense/statistical #818cf8 = 4.90:1, accent 8.09:1, etc.). NOTE: this is the source-defined indigo; at runtime --secondary-dim is collapsed onto the accent (see separate finding), so the rendered color may differ by theme.

**Impact.** The Shield Pressure category label is hard to read for low-vision users; it is the one section-label color below threshold.

**Fix.** Change shield-pressure's color from var(--secondary-dim) to var(--secondary) (#818cf8 = 4.90:1), matching the defense label.

---

### L25. Badge and ResultDot encode the same outcome concept with divergent APIs; ResultDot has no neutral state

**Area:** Component library consistency  ·  **Category:** consistency  ·  **Effort:** 🏗️ structural  ·  **Evidence:** both

**Where:** `src/renderer/components/ui/Badge.tsx:3,5 (variant: win|loss|neutral) vs ResultDot.tsx:3 (result: win|loss)`

**Issue.** Badge's prop is `variant: win|loss|neutral`; ResultDot's is `result: win|loss` with no neutral. Both encode game outcome using the same --win/--loss tokens but with different prop names and value sets. CSS confirms .result-dot has only .win/.loss, so a tie/in-progress state can't be represented with ResultDot.

**Impact.** Two primitives expressing one domain concept with inconsistent APIs are harder to reason about, and any tie/in-progress state has no ResultDot equivalent.

**Fix.** Align both on one prop name and a shared union (export type Outcome = 'win'|'loss'|'neutral'). Add a .result-dot.neutral rule mapped to a 'neutral' value, or document why dots are intentionally binary. (Pairs with the Sessions draw-state fix.)

---

### L26. Light theme leaks dark shadows: --shadow-xl and --shadow-glass are never overridden

**Area:** Design system & tokens  ·  **Category:** visual-design  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `tokens.css:99-100 (defs); [data-theme=light] tokens.css:185-187 overrides only sm/md/lg; themes.ts:393-395 sets only shadowSm/Md/Lg; consumed at components.css:1385 (.cmd-panel), :60 (.card:hover)`

**Issue.** applyTheme and the light CSS block both redefine --shadow-sm/md/lg but neither touches --shadow-xl (rgba(0,0,0,0.6)) or --shadow-glass (rgba(0,0,0,0.3)); the Theme model has no xl/glass fields. So under light theme the command palette and hovered cards keep the dark-tuned 50-60% black shadows.

**Impact.** The command palette and hovered cards cast an unnaturally heavy near-black shadow on a white UI, reading as muddy in light mode.

**Fix.** Add lighter values to the light block (e.g. --shadow-xl: 0 16px 48px rgba(15,23,42,0.12); --shadow-glass: 0 8px 32px rgba(15,23,42,0.1)) or add shadowXl/shadowGlass to the Theme model.

---

### L27. Stale 'Spring Green' identity: header comment and green :root fallbacks contradict the live accent and cause a green FOUC

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** both

**Where:** `tokens.css:3 (comment), :125-126 (green sidebar fallbacks), :135-137 (--plasma green); App.tsx:79,87 (async applyTheme); index.html (no data-theme/pre-paint script)`

**Issue.** tokens.css:3 says 'Spring Green accent' but --accent is cyan #22d3ee and runtime accent is chrome (liquid)/cyan (telemetry). The green :root fallbacks are overwritten by applyTheme, but index.html has no data-theme and no inline pre-paint script and applyTheme only runs after an awaited loadConfig — so during cold-start FOUC the green fallbacks paint (the active nav pill reads var(--sidebar-active-bg)).

**Impact.** Misleading source-of-truth that will mislead contributors, and a brief green flash on cold start before the theme effect resolves.

**Fix.** Rewrite the tokens.css:3 header to describe the cyan/chrome system and change the green :root fallbacks to default liquid values so any FOUC paints on-brand. Optionally write data-theme + critical tokens inline before first paint.

---

### L28. Dead tokens: charcoal/dark-spruce/ember, --sidebar-accent, --purple-rgb, and 4 of 6 chart-* are never consumed

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `tokens.css:20-22, :126 (--sidebar-accent), :140 (--purple-rgb), :61-64 (--chart-indigo/green/amber/red)`

**Issue.** Grep confirms zero var() consumers for --charcoal/--dark-spruce/--ember, --sidebar-accent (only defined and JS-set at themes.ts:392, never read), --purple-rgb, and --chart-indigo/green/amber/red. Only --chart-purple/--chart-cyan and --blue-rgb have real consumers.

**Impact.** Dead definitions inflate the token surface and invite off-system color use. --sidebar-accent looks load-bearing (set in applyTheme) but nothing reads it, which is actively misleading.

**Fix.** Delete the unused tokens and remove the orphaned root.style.setProperty('--sidebar-accent', ...) at themes.ts:392. Retain --chart-purple, --chart-cyan, --blue-rgb.

---

### L29. Coaching modal header close button (&times;) has no accessible label

**Area:** Accessibility  ·  **Category:** accessibility  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/components/CoachingModal.tsx:111-113`

**Issue.** <button className='coaching-close' onClick={onClose}>&times;</button> exposes only the multiplication sign as its accessible name. Other close buttons are labeled (TweaksPanel aria-label='Close tweaks', ReplayPlayer 'Close player'). Lowered to low because the footer also renders a labeled <button>Close</button>, so an SR user always has a working exit.

**Impact.** A screen reader announces the header button as 'times'/'multiplication sign', giving no hint it closes the dialog. Low impact given the labeled footer Close.

**Fix.** Add aria-label='Close coaching' to the .coaching-close button.

---

## ⚪ Nit (3)

### N1. Brand logo is a non-interactive image, not a home link

**Area:** Navigation, IA & window behavior  ·  **Category:** usability  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** tsx

**Where:** `src/renderer/components/LiquidShell.tsx:76-84 (magi-brand-logo motion.img, no onClick), :86 (.brand div aria-hidden)`

**Issue.** The MAGI logo at the top of the rail is a decorative image with no click handler, and the adjacent .brand div is aria-hidden. Clicking the logo does nothing, despite the near-universal convention that an app logo returns home.

**Impact.** A learned affordance (logo = home) silently fails. Low impact because Dashboard is the first rail item.

**Fix.** Wrap the logo in a <button>/Link to /dashboard with aria-label='Go to Dashboard', routing through the existing onNavigate handler.

---

### N2. Dead legacy .prose / .cursor-blink coaching CSS no longer matches any markup

**Area:** Coaching display  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `src/renderer/styles/components.css:2092-2133 (.coaching-modal .cursor-blink and .coaching-modal .prose h1..strong)`

**Issue.** These rules style a pre-CoachingCards rendering. Grep confirms no component renders a className containing 'prose' or 'cursor-blink'; the modal now renders CoachingCards (.cc-card-content) and the cursor is .cc-streaming-cursor. The orphaned .coaching-modal .prose h1..h3 { color: var(--accent) } also disagrees with the live heading style, a latent inconsistency if ever reactivated.

**Impact.** No user-facing effect today; pure maintenance debt that risks confusing future coaching-typography edits.

**Fix.** Delete the unused .coaching-modal .cursor-blink + @keyframes coaching-blink + .coaching-modal .prose blocks.

---

### N3. Neutralized legacy tokens are inert pass-throughs maintained in two code paths with zero consumers

**Area:** Design system & tokens  ·  **Category:** consistency  ·  **Effort:** 🛠️ quick-win  ·  **Evidence:** css

**Where:** `tokens.css:129-138; themes.ts:424-434`

**Issue.** --gradient-start/end, --shimmer, --surface-noise are hardcoded transparent in :root and re-forced transparent in applyTheme; --bg-glass/--bg-glass-strong/--border-glow are re-aliased to surface/border tokens and --plasma-a/b/c to accent. Grep confirms ALL have zero var() consumers.

**Impact.** Pure maintenance weight: two code paths keep tokens transparent and several aliases duplicate tokens under legacy names, all unread — noise in a 'single source of truth'.

**Fix.** Delete these tokens from tokens.css:129-138 and remove the corresponding setProperty calls in applyTheme. With no remaining consumers, this is a straight deletion.

---

## Suggested action plan

### Quick wins (75) — localized, high-leverage, low-risk

- `HIGH` **Primary 'Import Replays' action is a low-priority plain button stacked below the title, not a top-right primary** — Dashboard
- `HIGH` **Light theme --text-muted (#94a3b8) fails AA on all light surfaces** — Design system & tokens
- `HIGH` **Date column text fails WCAG AA under the active liquid theme (~3.6:1, ~3.3:1 on hover)** — Library
- `HIGH` **Keyboard-focusable table rows have no visible focus indicator** — Library / Accessibility
- `HIGH` **Opponent-character filter silently drops every matchup after the 8th alphabetically** — Trends
- `HIGH` **Game & Watch name color is hardcoded near-black hex — the label is invisible on its always-rendered tile** — Characters
- `HIGH` **Practice 'DELETE PLAN' deletes immediately with no confirmation, breaking the app's destructive-action pattern** — Practice
- `HIGH` **Game Theater stat-group labels and badge-neutral fail WCAG AA contrast (the smallest, most context-critical text)** — Game Theater (replay player) / Component library consistency
- `HIGH` **Saving Settings can silently revert the theme chosen in the Tweaks panel** — Settings
- `HIGH` **prefers-reduced-motion is ignored by every framer-motion animation** — Accessibility / Motion & micro-interactions
- `HIGH` **Ctrl+K command palette and numeric nav shortcuts are entirely undiscoverable** — Navigation, IA & window behavior
- `HIGH` **Duplicate .data-table blocks silently drop the intended 2px accent header underline** — Component library consistency
- `MEDIUM` **Oracle prose is an unbounded vertical wall of text with no max-height or internal scroll** — Dashboard
- `MEDIUM` **Dashboard's most-text element (Oracle) sits in the narrowest grid track; .dash-split has no minmax or reflow** — Dashboard / Navigation, IA & window behavior
- `MEDIUM` **Dashboard always-on muted labels (sparkline labels, 'Last 10') fail WCAG AA** — Dashboard
- `MEDIUM` **KPI labels and neutral KPI sub fail AA; the liquid override is dead because of an inline style** — Library / Dashboard / Component library consistency
- `MEDIUM` **Active filters have no summary and no clear/reset affordance** — Library
- `MEDIUM` **Translucent card lets the radial glow and MAGI watermark bleed behind chart/card data** — Trends / Sessions
- `MEDIUM` **Trends range/metric pills and clickable mini-chart cards have no custom focus ring** — Trends
- `MEDIUM` **Trends hero metric label rendered at 9px, inverting hierarchy against the 48px value** — Trends
- `MEDIUM` **Trends 'Opponent character' filter label fails WCAG AA contrast** — Trends
- `MEDIUM` **Win vs loss dots distinguished by color alone, with no non-color cue at 10px** — Sessions
- `MEDIUM` **Sessions card metadata (.session-card-sub / .session-card-opponents) fails WCAG AA contrast** — Sessions
- `MEDIUM` **Oracle empty state is top-anchored, leaving most of the chat card empty below** — Oracle (chat)
- `MEDIUM` **Oracle example-prompt and header-subtitle text fail WCAG AA contrast** — Oracle (chat)
- `MEDIUM` **Oracle input has no focus, placeholder, or disabled styling** — Oracle (chat)
- `MEDIUM` **Practice delete button has no danger styling; .btn-ghost is undefined repo-wide** — Practice
- `MEDIUM` **Single practice plan stretches to full content width, leaving a large empty void** — Practice
- `MEDIUM` **Practice drill instruction text and progress counter use --text-muted, failing AA** — Practice
- `MEDIUM` **Generating the first practice plan blanks the content region for the entire LLM round-trip** — Practice
- `MEDIUM` **Character detail hero stat labels use --text-muted at 10px — fails AA** — Characters
- `MEDIUM` **Stock-timeline kill-move labels and stock numbers are 8-9px muted text far below AA** — Game Theater (replay player)
- `MEDIUM` **Space key toggles pause AND scrolls the side column (no preventDefault)** — Game Theater (replay player)
- `MEDIUM` **Native radio + .model-select are off-palette, and the model dropdown lacks the accent focus ring its sibling input has** — Settings
- `MEDIUM` **Settings field labels and muted hints/links fail WCAG AA contrast in every theme** — Settings
- `MEDIUM` **.btn-danger white-on-red fails contrast on Clear All Games and Stop Watching** — Settings
- `MEDIUM` **Settings active-provider badges and 'configured' indicator hardcode green, washing out in Light theme** — Settings
- `MEDIUM` **Settings text-input labels are not programmatically associated with their inputs** — Settings
- `MEDIUM` **.card:hover hardcodes a dark slate background, flashing dark on every card hover in light theme** — Design system & tokens
- `MEDIUM` **Duplicate, conflicting .winrate-bar / .winrate-bar-fill blocks (legacy partially shadowed)** — Component library consistency
- `MEDIUM` **focus-visible is applied inconsistently across the secondary-control cluster** — Dynamic & interaction states
- `MEDIUM` **Two text inputs (model select, Oracle chat) have no focus style, and Library filter uses a weaker one** — Dynamic & interaction states
- `MEDIUM` **The floating gear (Tweaks) button has no :hover or :active feedback** — Dynamic & interaction states
- `MEDIUM` **Collapsible coaching section toggles have no keyboard focus indicator** — Coaching display
- `MEDIUM` **Timestamp jump-to-moment links have no keyboard focus state** — Coaching display
- `MEDIUM` **Collapsed coaching-card summary derives from a naive first-sentence regex — malformed on list-first LLM output** — Coaching display
- `MEDIUM` **Toggle Pills don't expose pressed/selected state to assistive tech** — Accessibility
- `MEDIUM` **MAGI Oracle is grouped under 'System' rather than 'Analyze'** — Navigation, IA & window behavior
- `MEDIUM` **Dashboard primary grids never reflow below the 900px minimum window width** — Navigation, IA & window behavior
- `LOW` **KPI metric labels render at 10px with sub-AA muted color (no liquid override)** — Dashboard
- `LOW` **Library numeric stat headers rely on ellipsis under fixed layout and clip at narrow widths** — Library
- `LOW` **Trends gridlines are unlabeled and near-invisible at 5% opacity** — Trends
- `LOW` **Result column header is empty and the dot column has no real header** — Library
- `LOW` **Sessions winrate bar is unlabeled, non-semantic, and reads like a divider in the liquid theme** — Sessions
- `LOW` **Session report renders inline and unconstrained, breaking grid alignment; error uses ad-hoc inline styles** — Sessions
- `LOW` **WinrateBar fill is a flat color regardless of value — encodes no win/loss, duplicating colored W-L text** — Characters
- `LOW` **Tall 3:4 character tiles at 220px min make the 26-tile grid low-density and force heavy scrolling** — Characters
- `LOW` **Plan progress bar reuses the 88px-wide WinrateBar — too short to read as plan completion** — Practice
- `LOW` **StockTimeline silently renders nothing on error, with no indication it exists** — Game Theater (replay player)
- `LOW` **Stat group titles (Performance / Defense / Offense) also below AA contrast** — Game Theater (replay player)
- `LOW` **Game Theater 'Back' relies solely on browser history, with no parent fallback or breadcrumb** — Navigation, IA & window behavior
- `LOW` **No content max-width: layout stretches edge-to-edge on ultrawide windows** — Navigation, IA & window behavior
- `LOW` **Tweaks density/color chips lack :hover feedback** — Dynamic & interaction states
- `LOW` **Recent-games table rows animate a JS hover scale + redundant backgroundColor over existing CSS hover** — Motion & micro-interactions
- `LOW` **Active nav item shows two competing indicators (sliding pill animates, static left bar teleports)** — Motion & micro-interactions
- `LOW` **Result-only colored dot has no text or accessible label (Library)** — Library
- `LOW` **Coaching section heading forced to a single ellipsized line clips informative labels in narrow surfaces** — Coaching display
- `LOW` **Shield Pressure coaching section label color fails WCAG AA at 10px** — Coaching display
- `LOW` **Light theme leaks dark shadows: --shadow-xl and --shadow-glass are never overridden** — Design system & tokens
- `LOW` **Stale 'Spring Green' identity: header comment and green :root fallbacks contradict the live accent and cause a green FOUC** — Design system & tokens
- `LOW` **Dead tokens: charcoal/dark-spruce/ember, --sidebar-accent, --purple-rgb, and 4 of 6 chart-* are never consumed** — Design system & tokens
- `LOW` **Coaching modal header close button (&times;) has no accessible label** — Accessibility
- `NIT` **Brand logo is a non-interactive image, not a home link** — Navigation, IA & window behavior
- `NIT` **Dead legacy .prose / .cursor-blink coaching CSS no longer matches any markup** — Coaching display
- `NIT` **Neutralized legacy tokens are inert pass-throughs maintained in two code paths with zero consumers** — Design system & tokens

### Structural (38) — multi-file, data-shape, or new components/states

- `HIGH` **"Import Replays" navigates to Settings instead of importing, and duplicates the empty-state CTA with a different label** — Dashboard
- `HIGH` **--text-muted fails WCAG AA for normal text in the shipped liquid theme and the telemetry/fallback theme** — Design system & tokens / Accessibility
- `HIGH` **Fixed 9-column table layout starves data columns and silently truncates content** — Library
- `HIGH` **Trends hero chart auto-scales to data min/max, so a 1pp wiggle looks like a 30pp collapse** — Trends
- `HIGH` **Trends hero/mini charts have no time x-axis because getTrendSeries discards dates** — Trends
- `HIGH` **Sessions W/L record and dot row disagree: non-win games render as red loss dots** — Sessions
- `HIGH` **Character detail view has no empty state for unplayed characters and fires a wasted LLM call** — Characters
- `HIGH` **Oracle example prompts are inert dim text, not clickable starter chips** — Oracle (chat)
- `HIGH` **Game stats encode good/bad by text color alone (WCAG 1.4.1)** — Game Theater (replay player)
- `HIGH` **CoachingModal lacks dialog semantics, Escape-to-close, and focus management** — Accessibility
- `HIGH` **Win/loss conveyed by color-only dot with no shape/icon/text, and absent from Library row accessible name** — Accessibility / Library / Sessions
- `HIGH` **Theme & density live only in the floating gear; Settings has no Appearance section** — Navigation, IA & window behavior
- `HIGH` **Dashboard MAGI Oracle bypasses CoachingCards and renders a raw markdown wall in a choked 1fr column** — Coaching display
- `HIGH` **Streaming coaching has no autoscroll and the live cursor is hidden inside collapsed sections** — Coaching display
- `MEDIUM` **Library renders all rows unvirtualized with a hard 500-game ceiling and no pagination** — Library
- `MEDIUM` **Library rolls its own loading/empty cells and shows misleading first-run copy** — Dynamic & interaction states / Library
- `MEDIUM` **Data-fetching pages have no error/retry state and fail silently** — Dynamic & interaction states
- `MEDIUM` **Trends charts are non-interactive: no hover tooltip, crosshair, or per-point readout** — Trends
- `MEDIUM` **Sessions per-game dot row becomes an unscannable band at high game counts** — Sessions
- `MEDIUM` **Oracle response is non-streaming; only a static 'Thinking…' placeholder** — Oracle (chat)
- `MEDIUM` **Oracle never surfaces what context/scope it is reasoning over** — Oracle (chat)
- `MEDIUM` **Oracle error renders as a bare red paragraph outside the chat layout, with no retry and lost input** — Oracle (chat)
- `MEDIUM` **Stock-timeline segments are clickable divs with no keyboard access or focus style** — Accessibility
- `MEDIUM` **Embedded player has no scrubber, frame-step, or speed control** — Game Theater (replay player)
- `MEDIUM` **Settings replay folder/tag used for import + watch is never persisted (mixed save model)** — Settings
- `MEDIUM` **applyTheme collapses --secondary/--secondary-dim onto the accent, so 'indigo' coaching sections render as accent color** — Design system & tokens
- `MEDIUM` **Entire --space-* scale (12 tokens) is defined but never referenced — the advertised 4px grid is unenforced** — Design system & tokens
- `MEDIUM` **Card vs KPI container primitives diverge on radius, background token, shadow, and hover** — Component library consistency
- `MEDIUM` **Page-level pseudo-cards re-implement the Card surface inconsistently (divergent background tokens)** — Component library consistency
- `MEDIUM` **Motion eases/springs are hardcoded in JS instead of the --ease-spring / --ease-out tokens** — Motion & micro-interactions
- `MEDIUM` **Route shell and each page both animate the same fade-up entrance, with mismatched durations** — Motion & micro-interactions
- `MEDIUM` **Hardcoded character-name palette was never contrast-checked — saturated/dark names fail AA on the card surface** — Characters
- `LOW` **Trends has no error state, and sparse-filter results show a silent blank chart** — Trends
- `LOW` **Pause/Play icon state is optimistic and can desync from Dolphin** — Game Theater (replay player)
- `LOW` **No way to verify an API key; fetchModels swallows errors so a bad key is indistinguishable from a hiccup** — Settings
- `LOW` **Primary Save Settings button is an unanchored bare button between two cards** — Settings
- `LOW` **Clearing Oracle history uses the native browser confirm() dialog** — Oracle (chat)
- `LOW` **Badge and ResultDot encode the same outcome concept with divergent APIs; ResultDot has no neutral state** — Component library consistency

---

## How this was produced

- **16 parallel reviewers**: one per page (Dashboard, Library, Trends, Sessions, Characters, Oracle, Practice, Settings, Game Theater) plus 7 cross-cutting concerns (design system & tokens, accessibility, dynamic/interaction states, component library, navigation & window behavior, coaching display, motion).
- **Source-reliability routing**: contrast/spacing/token/ARIA/state claims were computed from CSS/TSX (`file:line`); layout/hierarchy/density/truncation claims from the rendered screenshots; dynamic states (hover/focus/loading/error/empty) from code only. Contrast was never estimated from a screenshot.
- **Desktop-only constraint**: mobile/responsive-breakpoint findings were excluded; window-resize, min-width clipping, and the fixed 220px rail were assessed instead.
- **Verification pass** on every dimension dropped findings that were ungrounded, already implemented elsewhere, or too vague. 117 findings survived verification; synthesis then deduplicated and consolidated overlapping findings across dimensions (cross-area duplicates merged, recurring patterns rolled up into the 6 themes above) into the 113 ranked findings below.

**Per-dimension verified-findings tally (kept / dropped):**

| Dimension | Kept | Dropped |
| --- | ---: | ---: |
| Trends | 10 | 0 |
| Settings | 9 | 0 |
| Design system & tokens | 9 | 0 |
| Library | 8 | 0 |
| Oracle (chat) | 8 | 0 |
| Game Theater (replay player) | 8 | 0 |
| Coaching display | 8 | 0 |
| Sessions | 7 | 0 |
| Accessibility | 7 | 0 |
| Component library consistency | 7 | 1 |
| Navigation, IA & window behavior | 7 | 0 |
| Dashboard | 6 | 1 |
| Characters | 6 | 0 |
| Practice | 6 | 0 |
| Dynamic & interaction states | 6 | 0 |
| Motion & micro-interactions | 5 | 1 |

**What was merged in synthesis.** Removed 9 of 117 raw findings by merging true duplicates (same selector/component/file:line), per the over-merge guard: shared root causes were pushed into themes rather than collapsing distinct per-location fixes. Merges: (1) the two reduced-motion findings (Accessibility 'prefers-reduced-motion does not suppress framer-motion' + Motion 'honored only for CSS') -> one high finding, area Accessibility/Motion. (2) the two systemic --text-muted AA findings (Design-system 'fails AA on default surfaces' + Accessibility 'liquid theme --text-muted fails AA') -> one high finding (light-theme --text-muted kept separate as a different surface set). (3) three KPI label/sub contrast findings (Dashboard KPI-label, Library inline-style neutral sub, Component-library 'KPI label and neutral KPI sub') -> one; the distinct Dashboard sparkline/'Last 10' label piece was split out and kept, and the .kpi-label 10px-size facet retained as its own low finding. (4) two stat-group-label findings (Game Theater + Component-library badge-neutral) -> one, retaining the badge-neutral addition. (5) two color-only ResultDot + Library-row-aria findings (Library + Accessibility) -> one cross-cutting finding; the Sessions color-only-dot CSS facet and the Library-specific aria/empty-header callouts were kept as distinct lower-severity items because they have separate file:line fixes. (6) two MAGI watermark bleed findings (Trends + Sessions) -> one, citing both screenshot regions. (7) two WinrateBar 'flat fill, no win/loss meaning' findings (Sessions + Characters) -> one; Practice's 88px-width symptom and Component-library's duplicate-.winrate-bar-blocks issue were deliberately kept separate (different problems on the same component). (8) Trends '.pill no focus ring' folded into the app-wide focus-consistency finding, but Trends' role=button MiniChart-card focus gap was kept since that finding does not cover it. Findings that merely share the --text-muted or focus-visible root cause but point at different selectors/elements (table rows, coaching toggles, timestamp links, stock segments, drill text, settings labels, etc.) were intentionally NOT merged — their per-location specificity is the deliverable, and the shared cause lives in the themes. Net: 117 -> 108 findings.
