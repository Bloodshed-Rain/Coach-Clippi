import { describe, it, expect } from "vitest";
import path from "path";
import { processGame } from "../src/pipeline";
import { SYSTEM_PROMPT_CORNERMAN, assembleCornermanPrompt } from "../src/pipeline";

const FIXTURES = path.resolve(__dirname, "fixtures");
const game1 = processGame(path.join(FIXTURES, "game1.slp"), 1);
const game2 = processGame(path.join(FIXTURES, "game2.slp"), 2);
const targetTag = game1.gameSummary.players[0].tag;
const opponentTag = game1.gameSummary.players[1].tag;

describe("SYSTEM_PROMPT_CORNERMAN", () => {
  it("defines the three card sections and demands brevity", () => {
    expect(SYSTEM_PROMPT_CORNERMAN).toContain("## The Read");
    expect(SYSTEM_PROMPT_CORNERMAN).toContain("## Where You're Bleeding");
    expect(SYSTEM_PROMPT_CORNERMAN).toContain("## The Adjustment");
    expect(SYSTEM_PROMPT_CORNERMAN.toLowerCase()).toContain("120 words");
  });
});

describe("assembleCornermanPrompt", () => {
  it("includes set header, opponent habit data, and per-game lines for a single game", () => {
    const prompt = assembleCornermanPrompt([game1], targetTag, { wins: 1, losses: 0 }, null);
    expect(prompt).toContain("=== LIVE SET vs");
    expect(prompt).toContain(opponentTag);
    expect(prompt).toContain("1-0");
    expect(prompt).toContain("after knockdown");
    expect(prompt).toContain("at ledge");
    expect(prompt).not.toContain("=== ADAPTATION ACROSS SET ===");
    expect(prompt).not.toContain("=== PRIOR SCOUTING DOSSIER ===");
  });

  it("includes the adaptation section with two or more games", () => {
    const prompt = assembleCornermanPrompt([game1, game2], targetTag, { wins: 1, losses: 1 }, null);
    expect(prompt).toContain("=== ADAPTATION ACROSS SET ===");
    expect(prompt).toContain("Game 1");
    expect(prompt).toContain("Game 2");
  });

  it("includes and truncates a prior dossier", () => {
    const longDossier = "## Game Plan\n" + "x".repeat(5000);
    const prompt = assembleCornermanPrompt([game1], targetTag, { wins: 0, losses: 1 }, longDossier);
    expect(prompt).toContain("=== PRIOR SCOUTING DOSSIER ===");
    expect(prompt.length).toBeLessThan(longDossier.length + 4000);
  });
});
