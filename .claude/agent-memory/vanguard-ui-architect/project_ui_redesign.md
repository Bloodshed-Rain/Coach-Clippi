---
name: MAGI UI Redesign - Tactical Intelligence System
description: Second-gen UI overhaul transforming MAGI into a sci-fi weapons-system HUD with neural mesh, cut corners, glitch text, scan lines
type: project
---

MAGI renderer underwent a second comprehensive visual redesign on 2026-03-20, transforming from a "Nerve Center" glassmorphism aesthetic into a full "Tactical Intelligence System" -- a sci-fi combat HUD inspired by JARVIS, Ghost in the Shell, and cyberpunk war-room interfaces.

**Why:** User explicitly rejected conventional app design. Wanted something that has never been done before in a desktop app. The app should feel like booting up a weapon system, not opening a spreadsheet.

**How to apply:**
- Design language: beveled/cut corners (clip-path polygons), no rounded rects, military typography (Orbitron display font), uppercase everything
- New background system: neural mesh (animated radial gradients), hex grid overlay (dot pattern with mask), scan line (sweeping horizontal line), enhanced particle field (30 particles with glow)
- New hooks: `useGlitchText` (character-by-character reveal with random noise), `useUptime` (running clock in sidebar), `useMagneticCursor`, `useEnergyLines`
- Sidebar: system status uptime counter, corner bracket decorations, blinking status dot, nav items use clip-path instead of border-radius
- Page headers: left plasma border bar, page titles use glitch-text effect on mount
- All text uses military/tactical language: "ENGAGEMENTS" not "games", "ARSENAL" not "characters", "OPERATOR" not "player"
- Cards use `clip-path: polygon()` for beveled corners instead of border-radius
- The theme tokens are expanded with `--blue-rgb`, `--purple-rgb`, `--font-display` (Orbitron)
- Accessibility: all decorative elements use `aria-hidden="true"`, `prefers-reduced-motion` disables all background effects and animations
- Vite build confirmed working as of this redesign
