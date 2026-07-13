import fs from "fs";
import path from "path";

export function resolvePreloadPath(): string {
  const candidates = [
    path.resolve(__dirname, "../preload/index.js"),
    path.resolve(__dirname, "../../dist/main/preload/index.js"),
    path.resolve(process.cwd(), "dist/main/preload/index.js"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
}
