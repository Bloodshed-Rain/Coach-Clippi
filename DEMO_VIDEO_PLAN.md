# MAGI Demo Video Production Plan

## Direction

Create one caption-only trailer with music that works as both:

- A website hero/demo video.
- A source master for short social clips.

Recommended master length: 50-60 seconds.

Primary format: 16:9, 1920x1080.

Secondary exports:

- 9:16 vertical, 1080x1920, 30-45 seconds for TikTok/Reels/Shorts.
- 1:1 square, 1080x1080, 30-45 seconds for feeds.
- 15-second hook cut for posts or website previews.

Keep all captions center-safe so the 16:9 master can be cropped for vertical and square without rebuilding every title.

## Creative Rules

- Caption-only. No spoken voiceover.
- Music should be energetic, clean, and copyright-safe.
- Use real MAGI UI wherever possible. Avoid mockups unless filling a gap.
- Keep the pace fast, but hold each screen long enough to read one clear caption.
- Hide secrets, API keys, local usernames, file paths, and any replay data you do not want public.
- Prefer a polished demo database with several imported games, visible trends, a few cached AI analyses, and at least one replay with timestamps.

## Master Script

| Time | Visual | Caption | Recording notes |
| --- | --- | --- | --- |
| 0:00-0:04 | Fast Melee/replay clip, then MAGI logo or app window snap-in. | Your Slippi replays know why you lost. | Start with motion. A quick gameplay moment makes the hook legible before showing the app. |
| 0:04-0:10 | Replay folder/import flow, progress indicator, games appearing in the library/session list. | Drop in your games. MAGI turns them into coaching data. | Use a short import or staged footage with a populated library. |
| 0:10-0:18 | Dashboard and trends: record, matchup signal, rolling stats, improvement cards. | See your record, habits, matchups, and improvement over time. | Pan or cut through dashboard cards and trend charts. |
| 0:18-0:27 | Game coaching panel with specific analysis, best moments, worst misplays, and timestamp links. | Get AI coaching grounded in your actual frame data. | Use cached analysis if live generation is slow. Show one concrete coaching paragraph. |
| 0:27-0:34 | Click a timestamp or replay button from analysis/stock timeline. Replay player opens. | Jump from a mistake to the exact replay moment. | This is the proof shot. Make the click obvious. |
| 0:34-0:42 | Replay player with scrubber: pause, seek, restart, or scrub to a moment. | Scrub, review, and study the interaction without leaving MAGI. | If embedded playback is not ready on the capture machine, use external Dolphin fallback footage after the click. |
| 0:42-0:51 | Fast montage: Deep Discovery, Oracle, Practice, Characters, Command Palette. | Ask the Oracle. Find hidden patterns. Train what actually matters. | 1-2 seconds per feature, one readable UI beat each. |
| 0:51-0:56 | MAGI logo/app beauty shot plus website/download CTA. | MAGI. Melee Analysis through Generative Intelligence. | End on the name, not a feature list. |

## Shot Checklist

Record these in this order so editing is easy:

1. Clean app launch or logo/app hero shot.
2. Import replay folder or staged import progress.
3. Populated Dashboard.
4. Trends page with rolling metrics.
5. Game detail or coaching modal with analysis text.
6. Best Moments / Worst Misplays timestamp click.
7. Replay player opening from the timestamp.
8. Replay scrubber interaction.
9. Oracle page with a replay-aware question/answer.
10. Practice page with generated drills.
11. Deep Discovery or aggregate analysis result.
12. Characters page with card art/stats.
13. Command palette quick navigation.
14. Final logo/CTA shot.

## Caption Pass

Use short captions, one idea at a time:

1. Your Slippi replays know why you lost.
2. Drop in your games.
3. MAGI turns them into coaching data.
4. Track habits, matchups, and improvement.
5. Get AI coaching grounded in your frame data.
6. Jump to the exact mistake.
7. Scrub the replay. Study the interaction.
8. Ask the Oracle.
9. Find hidden patterns.
10. Train what actually matters.
11. MAGI.
12. Melee Analysis through Generative Intelligence.

## Recording Setup

- Capture the app at 1920x1080 if possible.
- Use the most polished theme for the site brand. The default Liquid Metal theme should be the first choice unless another theme looks better on video.
- Increase OS/app scaling only if text is too small in the recording.
- Use a clean demo data set with a recognizable story: a few wins/losses, clear matchup stats, and at least one replay with a timestamped coaching moment.
- Close unrelated windows and notifications.
- Confirm no API keys, local paths, private player names, or usernames appear on screen.
- Keep the cursor visible during important clicks, then avoid unnecessary cursor movement.
- Record a little extra before and after each shot so cuts have room.

## Music Direction

Pick a royalty-safe instrumental track with:

- Fast but not chaotic tempo.
- Strong downbeats for UI cuts.
- No vocals competing with captions.
- A clean ending or obvious beat for the MAGI logo close.

Suggested feel: futuristic training-room energy, tournament hype, sharp electronic percussion.

## Edit Notes

- Cut on music beats.
- Add subtle zooms or pans to static UI shots.
- Use a small number of caption styles and keep them consistent.
- Captions should sit in the lower-middle safe area, not at the extreme bottom.
- Avoid showing too many words at once. If a sentence is long, split it into two beats.
- Put the strongest proof moment in the middle: timestamp click into replay playback.
- End with a clean CTA, such as "Download on GitHub" or the website URL.

## Social Cutdowns

### 15-second hook cut

Use:

- 0:00 hook.
- Import/dashboard.
- AI coaching.
- Timestamp click into replay.
- MAGI close.

Caption sequence:

1. Your Slippi replays know why you lost.
2. MAGI turns them into coaching data.
3. Get AI coaching from your actual games.
4. Jump to the exact mistake.
5. MAGI.

### 30-second feature cut

Use:

- Hook.
- Dashboard/trends.
- Coaching.
- Replay scrubber.
- Oracle/Practice montage.
- Close.

Caption sequence:

1. Your Slippi replays know why you lost.
2. Track habits, matchups, and improvement.
3. Get coaching grounded in frame data.
4. Scrub the replay and study the moment.
5. Ask the Oracle. Train what matters.
6. MAGI.

## Export Specs

Website hero:

- MP4 H.264, 1920x1080, 24 or 30 fps.
- WebM VP9/AV1 if the site wants a smaller autoplay source.
- Keep under 25 MB if possible for fast page loading.
- Export one muted/autoplay-safe version.

Social:

- MP4 H.264, 1080x1920 for vertical.
- MP4 H.264, 1080x1080 for square.
- Burn captions into the video.
- Keep the first frame visually clear in case the platform uses it as a preview.

## Final Deliverables

- `magi-demo-master-16x9.mp4`
- `magi-demo-master-16x9.webm`
- `magi-demo-social-9x16.mp4`
- `magi-demo-social-1x1.mp4`
- `magi-demo-hook-15s-9x16.mp4`
- Optional: one clean poster frame for the website hero.
