/** Theme and character icons for the sidebar theme toggle and theme picker */

// ── Base Theme Icons ────────────────────────────────────────────────

export function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8.5a5.5 5.5 0 1 1-7-7 4.5 4.5 0 0 0 7 7z" />
    </svg>
  );
}

function CrtIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="10" rx="1" />
      <path d="M5 14h6M8 12v2" />
      <path d="M4 5h8M4 7.5h5" opacity="0.5" />
    </svg>
  );
}

function TournamentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8l-1 5H5L4 2z" />
      <path d="M6 7v2a2 2 0 0 0 4 0V7" />
      <path d="M6 13h4M8 9v4" />
      <path d="M3 2C2 3 2 5 3 6M13 2c1 1 1 3 0 4" />
    </svg>
  );
}

function AmberIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2C5 2 3 5 3 8c0 2.5 2 5 5 6 3-1 5-3.5 5-6 0-3-2-6-5-6z" />
      <path d="M8 5v4M6.5 7h3" opacity="0.5" />
    </svg>
  );
}

// ── Character Icons ─────────────────────────────────────────────────

function DrMarioIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="6" width="10" height="4" rx="2"/><path d="M8 6v4" opacity="0.5"/></svg>; }
function MarioIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13V5l5-3 5 3v8H3z"/><path d="M8 2v11" opacity="0.5"/></svg>; }
function LuigiIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2v10h8"/><path d="M4 7h5" opacity="0.5"/></svg>; }
function BowserIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2l2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1 2-4z"/></svg>; }
function PeachIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13h10V6l-2.5 2L8 4 5.5 8 3 6z"/></svg>; }
function YoshiIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><ellipse cx="8" cy="9" rx="4" ry="5"/><path d="M6 6c0-1 1-2 2-2s2 1 2 2" opacity="0.5"/></svg>; }
function DkIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4v8h4a4 4 0 0 0 0-8H4zM12 4v8"/></svg>; }
function FalconIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2L3 8l10 6-2-6z"/><path d="M3 8h10" opacity="0.5"/></svg>; }
function GanonIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2L3 14h10L8 2z"/><path d="M8 6v4" opacity="0.5"/></svg>; }
function FalcoIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 10s3-1 6-1 6 1 6 1M4 7s2-1 4-1 4 1 4 1M6 4s1-0.5 2-0.5 2 0.5 2 0.5"/><path d="M8 13v-4" opacity="0.5"/></svg>; }
function FoxIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2l2 3 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"/></svg>; }
function NessIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12" opacity="0.5"/></svg>; }
function IcsIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 14V6l4-4 4 4v8"/><path d="M4 10h8" opacity="0.5"/></svg>; }
function KirbyIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="9" r="5"/><path d="M6 7s.5-1 2-1 2 1 2 1" opacity="0.5"/></svg>; }
function SamusIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5"/><path d="M8 3v10M3 8h10" opacity="0.5"/></svg>; }
function ZeldaIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2l6 10H2L8 2z"/><path d="M8 6l3 5H5l3-5z" opacity="0.5"/></svg>; }
function SheikIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 5v6M5 8h6" opacity="0.5"/><path d="M3 3l10 10M13 3L3 13"/></svg>; }
function LinkIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2l8 3-8 3V2zM4 8v6l8-3V8"/></svg>; }
function YLinkIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 2l6 2-6 2V2zM5 7v5l6-2V7"/></svg>; }
function PichuIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 2L5 8h4l-2 6 6-6H9l2-6z"/></svg>; }
function PikachuIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2L3 10h6l-3 4 10-8h-6l3-6z"/></svg>; }
function PuffIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M10 6s-1-1-2-1-2 1-2 1" opacity="0.5"/></svg>; }
function MewtwoIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2a4 4 0 1 0 0 8 4 4 0 1 0 0-8z"/><path d="M8 10v4" opacity="0.5"/></svg>; }
function GnwIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M6 7h4M6 10h2" opacity="0.5"/></svg>; }
function MarthIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 3L5 13M4 11l2 2M13 5l-2-2"/><path d="M7 7l2 2" opacity="0.5"/></svg>; }
function RoyIcon() { return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2c0 4-3 5-3 9a3 3 0 0 0 6 0c0-4-3-5-3-9z"/><path d="M8 11v-2" opacity="0.5"/></svg>; }

// ── Icon Map ────────────────────────────────────────────────────────

export const THEME_ICONS: Record<string, React.FC> = {
  dark: MoonIcon,
  light: SunIcon,
  crt: CrtIcon,
  tournament: TournamentIcon,
  amber: AmberIcon,
  "char-drmario": DrMarioIcon,
  "char-mario": MarioIcon,
  "char-luigi": LuigiIcon,
  "char-bowser": BowserIcon,
  "char-peach": PeachIcon,
  "char-yoshi": YoshiIcon,
  "char-dk": DkIcon,
  "char-falcon": FalconIcon,
  "char-ganon": GanonIcon,
  "char-falco": FalcoIcon,
  "char-fox": FoxIcon,
  "char-ness": NessIcon,
  "char-ics": IcsIcon,
  "char-kirby": KirbyIcon,
  "char-samus": SamusIcon,
  "char-zelda": ZeldaIcon,
  "char-sheik": SheikIcon,
  "char-link": LinkIcon,
  "char-ylink": YLinkIcon,
  "char-pichu": PichuIcon,
  "char-pikachu": PikachuIcon,
  "char-puff": PuffIcon,
  "char-mewtwo": MewtwoIcon,
  "char-gnw": GnwIcon,
  "char-marth": MarthIcon,
  "char-roy": RoyIcon,
};
