# Reddit Launch Post (Working Draft)

Target: r/SSBM (adapt for r/smashbros later. Do not cross-post the same day).

The core strategy: the two predictable objections (AI vs. human coaches, environment/water)
are both strongest when *we* raise them first, honestly, in the body of the post. MAGI has
real answers: the stats engine is 100% deterministic, AI is opt-in, and the coaching layer
can run on a fully local model. Don't bury the AI angle (the app is literally named
"Generative Intelligence" and hiding it in the title reads as sneaky when someone clicks
the site), but don't lead with it either, because it isn't the load-bearing feature.

---

## Title options

1. **I built a free, open-source Slippi stats + replay review app. Your whole replay
   folder becomes a searchable local database (optional AI coaching, local models supported)**
2. MAGI: free open-source desktop app that turns Slippi replays into a stats database,
   trend tracker, and review workspace (Win/Mac/Linux)
3. Free open-source tool: searchable database of every Slippi game you've played, with
   trends, matchup records, and highlight deep-links

Option 1 is the recommendation: it leads with the deterministic value, discloses the AI
honestly in the same breath, and "local models supported" preempts the environment thread
before it starts.

---

## Post body

> **[FILL IN. Most important part of the whole post]:** one or two sentences about *you*.
> Your tag, how long you've played, roughly what level, and the one-liner on why you built
> it (e.g. "I kept losing to the same Marth and couldn't articulate why"). r/SSBM forgives
> almost anything from a community member and almost nothing from a marketer. This is the
> paragraph that decides which one you are.

Hey r/SSBM. I've been building this thing for the last [X months] and it's finally at a point where I'm not embarrassed to show people.

[PERSONAL PARAGRAPH GOES HERE]

The short version: it's a desktop app that eats your Slippi replay folder and turns it into a searchable database on your machine. So instead of "I think I lose to Marth a lot?" you can pull up your actual record in the matchup, see your neutral win rate over the last month, or filter down to every game against that one Falco who keeps queueing into you.

Stuff it does:

- Dashboard with your record, recent form, and rolling stat cards
- Trend charts for neutral win rate, L-cancel %, openings per kill, damage per opening, average death percent
- Library where you can filter games by opponent, matchup, stage, and result
- Matchup tables and character-specific stats (shine spikes, Ken combos, rest kills, wobbles, etc)
- Auto-detected highlights like 0-to-deaths and spike kills, and clicking one jumps the replay to that exact moment
- Game Theater, which is replay review with the stock timeline and stats sitting next to the game (embedded Dolphin on Windows, external Dolphin launch on Mac/Linux)
- Practice plans based on patterns it keeps seeing in your games, with completion tracking

Now the AI part, because I know how this sub feels about AI and I'd rather just address it head on:

- Everything in the list above is normal deterministic replay parsing. No AI involved anywhere. You could use this app for years and never touch an LLM.
- There is an optional coaching layer (per-game analysis, session reports, a chat that answers questions about your recent games). You pick what powers it: a free no-key option, your own API key, or a local model through Ollama or LM Studio running on your own GPU. With a local model, literally nothing leaves your machine.
- It's not a replacement for a human coach and I'm not going to pretend it is. A real coach watches you play, adapts to you, and holds you accountable. This thing reads numbers out of replays and points at patterns. If you already work with a coach, showing up with your actual stats probably makes the session better. If you're like most of us and were never going to book coaching anyway, that's who I made it for.
- If the environmental cost of hosted AI bugs you, honestly, fair. That's a big part of why local models are supported and why the AI stuff is opt-in instead of being the core of the app. Leave it off and it's still a full stats and review tool.

What's the catch: there isn't one. It's free and MIT licensed. No account, no server, no telemetry, nothing to buy. Your replays and stats sit in a SQLite file in your home folder. I made it because I wanted it to exist.

Windows, Mac, and Linux.

Site: https://themagi.gg
Source and downloads: https://github.com/Bloodshed-Rain/TheMAGI

It's open source, so if the code is bad you're legally allowed to tell me. Issues and PRs welcome.

---

## Screenshots to attach (as a gallery, in this order)

1. `screenshots/app-dashboard.png` first impression, shows it's a real polished app
2. `screenshots/app-trends.png` the deterministic-stats story in one image
3. `screenshots/app-game-theater.png` replay review is the feature nobody objects to
4. `screenshots/app-characters.png` matchup tables, pure Melee-nerd appeal

Keep the Oracle/AI screenshot out of the gallery. Not to hide it (the body discloses it
plainly) but the images set the frame, and the frame should be "stats tool."

---

## Comment playbook

Rules of engagement: reply once per objection thread, concede whatever part is valid,
state the facts, and disengage. Never sarcastic, never defensive on round two. Screenshots
of the dev being snippy outlive the thread, and an upvoted hostile comment with a calm
reply under it actually works in your favor.

**"This takes work away from human coaches."**
> Fair thing to care about, coaching is one of the few ways people in this scene actually
> get paid. Honestly though, I think the overlap is small. This is for the huge majority of
> players who were never going to book a session. It reads your replays and points at
> numbers, it can't watch you play, read your mental game, or hold you accountable. If
> anything I'd love for coaches to use it, a student showing up with their actual stats
> makes a paid hour go further.

**"AI is destroying the environment / water usage."**
> Totally get it, and it's part of why the app is built the way it is. Every stat, trend,
> and highlight is deterministic replay parsing with no AI involved, and the coaching layer
> is opt-in. If you do want it, you can point it at a local model on your own GPU through
> Ollama or LM Studio so nothing touches a data center. Hosted providers exist for people
> who want them, but the app never requires one.

(If pressed on hosted-AI numbers: don't get into a citation war. One sentence, something
like "a coaching analysis is a few thousand tokens of text, and I'm not going to claim
that's zero, which is exactly why local and off are both first-class options," then stop.)

**"LLM coaching advice is slop."**
> The LLM doesn't compute anything. Every number it references comes from the deterministic
> stats pipeline, and it's prompted to talk about your data, not generic advice. If it says
> something wrong about a game, that's a bug and I want to know about it. It's also the
> most skippable feature in the app.

**"This is just an ad / stealth marketing."**
> It's MIT licensed, there's no account, no subscription, no telemetry, and nothing to buy.
> I posted it because I made a thing for this community and wanted people to have it.

**"Does it work on Mac/Linux?"**
> Yes, full stats/trends/coaching on all three platforms. The one Windows-only piece is the
> embedded replay viewer. Mac/Linux launch replays in external Dolphin instead.

---

## Posting checklist

- [ ] Read r/SSBM's rules on self-promotion **before** posting; if unclear, message the
      mods first. A mod-removed launch post is worse than no post.
- [ ] Post from an account with genuine r/SSBM comment history. If the account is fresh,
      that is the single biggest roast risk, bigger than the AI angle.
- [ ] Fill in the personal paragraph and the [X months] placeholder.
- [ ] Attach the 4-screenshot gallery.
- [ ] Post a weekday morning US time (~9-11am ET) and stay in the comments for the first
      2-3 hours. Answering fast and honestly is most of the battle.
- [ ] Make sure the latest GitHub release is fresh and the README screenshots load, since
      that's where the traffic goes.
- [ ] Do not post to r/smashbros the same day; give it a week and adapt the framing
      (less Slippi jargon).
