import { Frames, type ConversionType, type FramesType, type ItemUpdateType } from "@slippi/slippi-js/node";

import type { TurnipPullStats } from "./pipeline/types.js";

export const PEACH_CHARACTER_ID = 12;
export const TURNIP_TYPE_ID = 99;
export const STITCH_FACE_ID = 7;
export const PEACH_RARE_ITEMS: Record<number, string> = {
  103: "Mr. Saturn",
  104: "Bob-omb",
  55: "Beam Sword",
};

const TURNIP_FACE_NAMES: Record<number, string> = {
  0: "neutral",
  1: "smile",
  2: "wink",
  3: "surprised",
  4: "happy",
  5: "circle eyes",
  6: "carrot eyes",
  7: "stitch face",
};

const OBSERVED_ITEM_PREFIX = "observed-item";
const ITEM_THROW_MOVE_ID = 1;

function ratio(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

export function itemInstanceKey(item: Pick<ItemUpdateType, "spawnId" | "instanceId" | "typeId">): string | null {
  if (item.spawnId != null) return `spawn:${item.spawnId}`;
  if (item.instanceId != null) return `instance:${item.typeId ?? "unknown"}:${item.instanceId}`;
  return null;
}

export function observeItemInstance(seenKeys: Set<string>, item: ItemUpdateType): string | null {
  const instanceKey = itemInstanceKey(item);
  if (!instanceKey) return null;

  const observedKey = `${OBSERVED_ITEM_PREFIX}:${instanceKey}`;
  if (seenKeys.has(observedKey)) return null;

  seenKeys.add(observedKey);
  return instanceKey;
}

export function markObservedItemInstances({
  frames,
  seenKeys,
  fromFrame,
  toFrame,
}: {
  frames: FramesType;
  seenKeys: Set<string>;
  fromFrame: number;
  toFrame: number;
}): void {
  for (let frame = fromFrame; frame <= toFrame; frame++) {
    const items = frames[frame]?.items;
    if (!items) continue;

    for (const item of items as ItemUpdateType[]) {
      const instanceKey = itemInstanceKey(item);
      if (instanceKey) {
        seenKeys.add(`${OBSERVED_ITEM_PREFIX}:${instanceKey}`);
      }
    }
  }
}

export function collectPeachTurnipPullStats({
  frames,
  playerIndex,
  myConversions,
  lastFrame,
}: {
  frames: FramesType;
  playerIndex: number;
  myConversions: ConversionType[];
  lastFrame: number;
}): TurnipPullStats | null {
  const seenSpawnIds = new Set<number>();
  const faceCounts = new Map<number, number>();
  const rareItemCounts = new Map<string, number>();
  let totalPulls = 0;
  let turnipsHit = 0;

  for (let frame = Frames.FIRST_PLAYABLE; frame <= lastFrame; frame++) {
    const items = frames[frame]?.items;
    if (!items) continue;

    for (const item of items) {
      const spawnId = item.spawnId;
      if (spawnId == null || seenSpawnIds.has(spawnId)) continue;
      seenSpawnIds.add(spawnId);

      if (item.owner !== playerIndex) continue;

      const typeId = item.typeId ?? -1;

      if (typeId === TURNIP_TYPE_ID) {
        totalPulls++;
        const face = item.turnipFace ?? 0;
        faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
      } else if (PEACH_RARE_ITEMS[typeId]) {
        totalPulls++;
        const name = PEACH_RARE_ITEMS[typeId]!;
        rareItemCounts.set(name, (rareItemCounts.get(name) ?? 0) + 1);
      }
    }
  }

  for (const conversion of myConversions) {
    for (const move of conversion.moves) {
      if (move.moveId === ITEM_THROW_MOVE_ID) {
        turnipsHit++;
      }
    }
  }

  if (totalPulls === 0) return null;

  const faces = [...faceCounts.entries()]
    .map(([face, count]) => ({ face: TURNIP_FACE_NAMES[face] ?? `face ${face}`, count }))
    .sort((a, b) => b.count - a.count);

  const rareItems = [...rareItemCounts.entries()]
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count);

  const turnipCount = [...faceCounts.values()].reduce((a, b) => a + b, 0);

  return {
    totalPulls,
    faces,
    turnipsHit,
    hitRate: turnipCount > 0 ? ratio(turnipsHit, turnipCount) : 0,
    rareItems,
  };
}
