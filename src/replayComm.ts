export interface ReplayCommOptions {
  replayPath: string;
  startFrame?: number | null;
  endFrame?: number | null;
  commandId: string;
}

export function buildReplayCommData({
  replayPath,
  startFrame,
  endFrame,
  commandId,
}: ReplayCommOptions): Record<string, unknown> {
  const start = startFrame == null ? null : Math.max(0, Math.floor(startFrame));
  const end = endFrame == null ? null : Math.max(start ?? 0, Math.floor(endFrame));

  return {
    mode: "queue",
    queue: [
      {
        path: replayPath,
        ...(start != null ? { startFrame: start } : {}),
        ...(end != null ? { endFrame: end } : {}),
      },
    ],
    isRealTimeMode: false,
    commandId,
  };
}
