import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const APP_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/renderer/App.tsx"), "utf-8");
const COMMAND_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/renderer/components/CommandPalette.tsx"),
  "utf-8",
);

function extractPageUnion(source: string): string[] {
  const match = source.match(/type Page = ([^;]+);/);
  if (!match) throw new Error("Could not find Page type");
  return Array.from(match[1]!.matchAll(/"([^"]+)"/g), (m) => m[1]!);
}

describe("navigation model", () => {
  it("keeps command palette pages aligned with the app shell pages", () => {
    const appPages = extractPageUnion(APP_SOURCE);
    const commandPages = extractPageUnion(COMMAND_SOURCE);
    expect(commandPages).toEqual(appPages);
  });
});
