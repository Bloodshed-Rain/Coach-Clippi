# Reddit Launch Post — Working Draft

Target: r/SSBM (adapt for r/smashbros later — do not cross-post the same day).

The core strategy: the two predictable objections (AI vs. human coaches, environment/water)
are both strongest when *we* raise them first, honestly, in the body of the post. MAGI has
real answers — the stats engine is 100% deterministic, AI is opt-in, and the coaching layer
can run on a fully local model. Don't bury the AI angle (the app is literally named
"Generative Intelligence" — hiding it in the title reads as sneaky when someone clicks the
site), but don't lead with it either, because it isn't the load-bearing feature.

---

## Title options

1. **I built a free, open-source Slippi stats + replay review app — your whole replay
   folder becomes a searchable local database (optional AI coaching, local models supported)**
2. MAGI — free open-source desktop app that turns Slippi replays into a stats database,
   trend tracker, and review workspace (Win/Mac/Linux)
3. Free open-source tool: searchable database of every Slippi game you've played, with
   trends, matchup records, and highlight deep-links

Option 1 is the recommendation: it leads with the deterministic value, discloses the AI
honestly in the same breath, and "local models supported" preempts the environment thread
before it starts.

---

## Post body

> **[FILL IN — most important part of the whole post]:** one or two sentences about *you*.
> Your tag, how long you've played, roughly what level, and the one-liner on why you built
> it (e.g. "I kept losing to the same Marth and couldn't articulate why"). r/SSBM forgives
> almost anything from a community member and almost nothing from a marketer. This is the
> paragraph that decides which one you are.

Hey r/SSBM. I've spent the last [X months] building MAGI and it's finally in a state worth sharing.

[PERSONAL PARAGRAPH GOES HERE]

**What it does:** you point it at your Slippi replay folder and it imports everything into a local database on your machine. From there:

- Dashboard with your record, recent form, and rolling stat cards
- Trends over time — neutral win rate, L-cancel %, openings per kill, damage per opening, average death percent
- Library with filters by opponent, matchup, stage, and result
- Per-character matchup tables and signature stats (shine spikes, Ken combos, rest kills, wobbles…)
- Auto-detected highlights (0-to-deaths, spike kills, 4-stocks, comebacks) that deep-link into the replay at the exact frame
- Game Theater: replay review with stock timeline and stats side by side (embedded Dolphin on Windows, external Dolphin launch on Mac/Linux)
- Practice plans built from your recurring weak patterns, with completion tracking

**About the AI part — being upfront since I know how people feel about it:**

- Everything listed above is deterministic replay parsing. No LLM involved anywhere. You can use the app forever and never touch an AI feature.
- There's an optional coaching layer (per-game analysis, session reports, a chat that answers questions about your recent games). You choose what powers it: a free no-key option, your own API key, or a **fully local model through Ollama / LM Studio** — in which case nothing ever leaves your machine and no data center is involved.
- It is not a replacement for a human coach and I'm not pitching it as one. A coach watches you play, adapts to you, and holds you accountable. This reads numbers out of your replays and points at patterns. If you work with a coach, showing up with your actual stats makes their hour more useful. If you're like most of us and were never going to book coaching, that's who this is for.
- If the resource cost of hosted AI bothers you — that's part of why local models are supported and why the AI layer is opt-in instead of load-bearing. Leave it off and the app is still a full stats and review tool.

**What it costs:** nothing. Free, MIT-licensed, open source. No account, no server, no telemetry — your replays and stats live in a SQLite file in your home folder. I built it because I wanted it to exist.

Windows / macOS / Linux.

Site: https://themagi.gg
Source + downloads: https://github.com/Bloodshed-Rain/TheMAGI

It's open source — roast the code if you want, issues and PRs welcome.

---

## Screenshots to attach (as a gallery, in this order)

1. `screenshots/app-dashboard.png` — first impression, shows it's a real polished app
2. `screenshots/app-trends.png` — the deterministic-stats story in one image
3. `screenshots/app-game-theater.png` — replay review is the feature nobody objects to
4. `screenshots/app-characters.png` — matchup tables, pure Melee-nerd appeal

Keep the Oracle/AI screenshot out of the gallery. Not to hide it — the body discloses it
plainly — but the images set the frame, and the frame should be "stats tool."

---

## Comment playbook

Rules of engagement: reply once per objection thread, concede whatever part is valid,
state the facts, and disengage. Never sarcastic, never defensive on round two — screenshots
of the dev being snippy outlive the thread. Upvoted hostile comments with a calm reply
under them actually work in your favor.

**"This takes work away from human coaches."**
> Fair thing to care about — coaching is one of the few ways people in this scene get paid.
> Honestly though, the overlap is small: this is for the huge majority of players who were
> never going to book a session. It reads your replays and points at numbers; it can't watch
> you play, read your mental game, or hold you accountable. If anything I'd love for coaches
> to use it — a student showing up with their actual stats makes a paid hour go further.

**"AI is destroying the environment / water usage."**
> Legit concern and part of why it's built the way it is: every stat, trend, and highlight
> is deterministic replay parsing — no AI involved — and the coaching layer is opt-in. If you
> do want it, you can point it at a local model on your own GPU through Ollama or LM Studio,
> so nothing touches a data center. Hosted providers are supported for people who want them,
> but the app never requires one.

(If pressed on hosted-AI numbers: don't get into a citation war. One sentence — "a coaching
analysis is a few thousand tokens of text; I'm not going to claim that's zero, which is
exactly why local and off are both first-class options" — then stop.)

**"LLM coaching advice is slop."**
> The LLM doesn't compute anything — every number it references comes from the deterministic
> stats pipeline, and it's prompted to talk about *your* data, not generic advice. If it says
> something wrong about a game, that's a bug I want to know about. It's also the most
> skippable feature in the app.

**"This is just an ad / stealth marketing."**
> It's MIT-licensed, there's no account, no subscription, no telemetry, and nothing to buy.
> I posted it because I made a thing for this community and wanted people to have it.

**"Does it work on Mac/Linux?"**
> Yes — full stats/trends/coaching on all three platforms. The one Windows-only piece is the
> embedded replay viewer; Mac/Linux launch replays in external Dolphin instead.

---

## Posting checklist

- [ ] Read r/SSBM's rules on self-promotion **before** posting; if unclear, message the
      mods first. A mod-removed launch post is worse than no post.
- [ ] Post from an account with genuine r/SSBM comment history. If the account is fresh,
      that is the single biggest roast risk — bigger than the AI angle.
- [ ] Fill in the personal paragraph and the [X months] placeholder.
- [ ] Attach the 4-screenshot gallery.
- [ ] Post a weekday morning US time (~9–11am ET) and stay in the comments for the first
      2–3 hours. Answering fast and honestly is most of the battle.
- [ ] Make sure the latest GitHub release is fresh and the README screenshots load —
      that's where the traffic goes.
- [ ] Do not post to r/smashbros the same day; give it a week and adapt the framing
      (less Slippi-jargon).
