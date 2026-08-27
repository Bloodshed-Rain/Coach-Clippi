import type { CornermanLiveEvent, CornermanLiveEventType } from "./cornermanLiveEvents";
import { expandCornermanShorthand } from "./cornermanText";

const GRAB_CONVERSION_TYPES = new Set<CornermanLiveEventType>(["chain-grab", "tech-chase", "upthrow-upair", "wobble"]);

const CLOSE_PRESSURE_TYPES = new Set<CornermanLiveEventType>([
  "waveshine",
  "drill-shine",
  "pillar-combo",
  "shine-grab",
  "bair-string",
  "dsmash-kill",
]);

const RECOVERY_TYPES = new Set<CornermanLiveEventType>([
  "edgeguard-kill",
  "spike-kill",
  "shine-spike",
  "fair-gimp",
  "cape-gimp",
]);

const BIG_PUNISH_TYPES = new Set<CornermanLiveEventType>([
  "ken-combo",
  "high-combo-kill",
  "huge-conversion",
  "zero-to-death",
  "early-kill",
  "stomp-knee",
  "rest-kill",
]);

const ITEM_TYPES = new Set<CornermanLiveEventType>(["stitch-face", "rare-item"]);

const KILL_TYPES = new Set<CornermanLiveEventType>([
  "high-combo-kill",
  "zero-to-death",
  "early-kill",
  "edgeguard-kill",
  "spike-kill",
  "shine-spike",
  "upthrow-upair",
  "fsmash-kill",
  "stomp-knee",
  "knee-kill",
  "fair-gimp",
  "rest-kill",
  "dsmash-kill",
  "charge-shot",
  "up-b-kill",
  "thunder-kill",
  "upsmash-kill",
  "shoryuken",
  "ganon-stomp",
  "ganon-side-b",
  "cape-gimp",
]);

function cleanForSpeech(text: string): string {
  return expandCornermanShorthand(text)
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/^\s*(?:[-+]\s+|\d+[.)]\s+)/gm, "")
    .replace(/\s*->\s*/g, " into ")
    .replace(/(\d)%(?=\b|\s|[.,;:!?]|$)/g, "$1 percent")
    .replace(/\s+/g, " ")
    .trim();
}

function actorIsTarget(event: CornermanLiveEvent): boolean {
  return event.actorIsTarget ?? /^You\b/.test(event.body);
}

/** Turn a detected highlight into one short, action-oriented spoken callout. */
export function buildCornermanVoiceTip(event: CornermanLiveEvent): string {
  const title = cleanForSpeech(event.title);
  const mine = actorIsTarget(event);

  if (event.type === "shield-break") {
    return mine
      ? "Your shield broke. Reset, then use movement instead of holding shield."
      : "Their shield broke. Stay composed and take the guaranteed punish.";
  }

  if (event.type === "self-destruct") {
    return mine
      ? "Reset. Slow down offstage and take the safe recovery route."
      : "They self-destructed. Take center and protect your lead.";
  }

  if (ITEM_TYPES.has(event.type)) {
    return mine
      ? `${title} in hand. Protect the pull and choose a safe setup.`
      : `${title} in play. Give ${event.actorCharacter} space and respect the item.`;
  }

  if (mine) {
    if (KILL_TYPES.has(event.type)) {
      return `${title}. Good finish. Reset to center and keep the same win condition.`;
    }
    return `${title}. Good conversion. Remember the opener and look for it again.`;
  }

  if (RECOVERY_TYPES.has(event.type)) {
    return "Watch the edgeguard. Save your jump and change your recovery timing.";
  }
  if (GRAB_CONVERSION_TYPES.has(event.type)) {
    return "Watch the grab conversion. Mix your tech and directional influence.";
  }
  if (CLOSE_PRESSURE_TYPES.has(event.type)) {
    return "They are winning up close. Make space and vary your defense.";
  }
  if (BIG_PUNISH_TYPES.has(event.type)) {
    return "That punish started from one opening. Reset and deny the starter.";
  }

  return `Watch the ${title.toLowerCase()}. Deny the same setup next time.`;
}

/** Pull only the one-sentence adjustment from a completed between-game card. */
export function extractCornermanSpokenAdjustment(markdown: string): string | null {
  const match = markdown.match(/^##\s+The Adjustment\s*\r?\n([\s\S]*?)(?=^##\s+|\s*$)/im);
  if (!match?.[1]) return null;

  const adjustment = cleanForSpeech(match[1]);
  if (!adjustment) return null;

  const capped = adjustment.length <= 260 ? adjustment : `${adjustment.slice(0, 257).replace(/\s+\S*$/, "")}...`;
  return `Next game. ${capped}`;
}
