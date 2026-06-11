#!/usr/bin/env node
/**
 * Provenance-only fixture generator for MAGI's test suite.
 *
 * This script is NOT run by `npm test` or in CI. The reproducible artifacts are
 * the committed `tests/fixtures/*.slp` files; this script only documents how they
 * were produced so they can be regenerated if needed.
 *
 * What it does:
 *  - Trims a full-length source .slp down to a small, self-contained replay by
 *    keeping the Event-Payloads + Game-Start header, every whole frame group up
 *    to a chosen Frame-Bookend (0x3C) boundary, then appending the original
 *    Game-End (0x39) event. The result is a valid replay slippi-js can parse and
 *    compute real stats from.
 *  - Scrubs personally-identifying netplay data (display names, connect codes)
 *    via same-length byte replacement, so no third-party PII enters git history.
 *    Same-length replacement keeps UBJSON string length prefixes valid; the
 *    scrubbed name fields become empty, so getPlayerTag() falls back to "P{port}".
 *
 * Source replay is a user-local file (gitignored, not committed). Override with:
 *   MAGI_FIXTURE_SRC=/path/to/full.slp node tests/fixtures/generate-fixtures.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC =
  process.env.MAGI_FIXTURE_SRC || path.resolve(__dirname, "../../../TheMAGI/test-replays/fixture.slp");

// PII strings to scrub from the source replay (display names + connect codes).
// Each is replaced in-place with same-length filler so UBJSON length prefixes
// stay valid and the result is deterministic.
const PII = ["themagi.gg", "GIVEMEYOUREYES", "SLOP#790", "INRI#666"];

// Output fixtures: two distinct trims of the same source game. game1 is cut past
// the first stock loss for richer stats; game2 is a shorter distinct trim (so it
// hashes differently and exercises multi-game adaptation paths).
const OUTPUTS = [
  { name: "game1.slp", cutFrame: 3060 },
  { name: "game2.slp", cutFrame: 1400 },
];

function locateRaw(buf) {
  const marker = Buffer.from([0x55, 0x03, 0x72, 0x61, 0x77]); // U \x03 r a w
  const idx = buf.indexOf(marker);
  if (idx < 0) throw new Error("could not find 'raw' key in source .slp");
  // After the key: array header `[$U#l` (5 bytes) then a 4-byte big-endian length.
  const arrHeader = buf.slice(idx + 5, idx + 10).toString("latin1");
  if (arrHeader !== "[$U#l") throw new Error(`unexpected raw array header: ${JSON.stringify(arrHeader)}`);
  const lenOff = idx + 10;
  const rawLen = buf.readUInt32BE(lenOff);
  const rawStart = lenOff + 4;
  return { lenOff, rawLen, rawStart, rawEnd: rawStart + rawLen };
}

function parsePayloadSizes(buf, rawStart) {
  if (buf[rawStart] !== 0x35) throw new Error("raw does not start with Event Payloads (0x35)");
  const listingLen = buf[rawStart + 1]; // total size of the listing payload
  const sizes = {};
  let q = rawStart + 2;
  const entries = (listingLen - 1) / 3;
  for (let e = 0; e < entries; e++) {
    sizes[buf[q]] = buf.readUInt16BE(q + 1);
    q += 3;
  }
  return { sizes, eventPayloadsEnd: rawStart + 1 + listingLen };
}

function trim(buf, cutFrame) {
  const { lenOff, rawStart, rawEnd } = locateRaw(buf);
  const { sizes, eventPayloadsEnd } = parsePayloadSizes(buf, rawStart);

  let off = eventPayloadsEnd;
  let cutOffset = null; // byte index just past the target Frame Bookend
  let gameEndBytes = null;

  while (off < rawEnd) {
    const cmd = buf[off];
    const sz = sizes[cmd];
    if (sz === undefined) throw new Error(`unknown command 0x${cmd.toString(16)} at ${off}`);
    const eventEnd = off + 1 + sz;
    if (cmd === 0x39) gameEndBytes = buf.slice(off, eventEnd); // remember the real Game End
    if (cmd === 0x3c) {
      // Frame Bookend: frame number is the first int32 of the payload.
      const frame = buf.readInt32BE(off + 1);
      if (cutOffset === null && frame >= cutFrame) cutOffset = eventEnd;
    }
    off = eventEnd;
  }

  if (cutOffset === null) throw new Error(`no Frame Bookend at/after frame ${cutFrame}`);
  if (!gameEndBytes) throw new Error("source has no Game End event");

  // New raw stream = [Event Payloads .. cut bookend] + original Game End.
  const newRaw = Buffer.concat([buf.slice(rawStart, cutOffset), gameEndBytes]);

  // Rebuild file: original head up to the raw length field, new length, new raw,
  // then the original metadata tail (everything after the old raw block).
  const head = buf.slice(0, lenOff);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(newRaw.length, 0);
  const metadataTail = buf.slice(rawEnd);
  return Buffer.concat([head, lenBuf, newRaw, metadataTail]);
}

function scrubPII(buf) {
  for (const s of PII) {
    const needle = Buffer.from(s, "latin1");
    let found = 0;
    let from = 0;
    for (;;) {
      const at = buf.indexOf(needle, from);
      if (at < 0) break;
      buf.fill(0x00, at, at + needle.length); // same-length zero fill
      found++;
      from = at + needle.length;
    }
    if (found === 0) console.warn(`  warning: PII string ${JSON.stringify(s)} not found (already clean?)`);
  }
  return buf;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source replay not found: ${SRC}`);
    console.error("Set MAGI_FIXTURE_SRC to a full-length .slp to regenerate fixtures.");
    process.exit(1);
  }
  const src = fs.readFileSync(SRC);
  for (const { name, cutFrame } of OUTPUTS) {
    const trimmed = scrubPII(trim(src, cutFrame));
    const dest = path.resolve(__dirname, name);
    fs.writeFileSync(dest, trimmed);
    console.log(`wrote ${name}: ${(trimmed.length / 1024).toFixed(0)} KB (cut at frame ${cutFrame})`);
  }
}

main();
