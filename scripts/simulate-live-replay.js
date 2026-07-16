#!/usr/bin/env node
// Dev harness: stream a finished .slp into a watched folder in chunks to
// reproduce the live-replay path (growing file + incremental parse) without
// playing a real game. Exercises the Cornerman live monitor's snapshot stream
// and the declared-rawDataLength stalled-parser rebuild.
//
// Usage:
//   node scripts/simulate-live-replay.js <source.slp> <destFolder> [--chunk 8192] [--interval 100] [--name live.slp]
//
// Point Cornerman's replay folder at <destFolder>, start a corner session, then
// run this — you should see the live-stats strip tick as the file grows, freeze
// FINAL at the end, then reset if you run it again with a new --name.

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const positional = [];
  const opts = { chunk: 8192, interval: 100, name: "live.slp" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--chunk") opts.chunk = Number(argv[++i]);
    else if (arg === "--interval") opts.interval = Number(argv[++i]);
    else if (arg === "--name") opts.name = argv[++i];
    else positional.push(arg);
  }
  return { positional, opts };
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));
  const [source, destFolder] = positional;

  if (!source || !destFolder) {
    console.error("Usage: node scripts/simulate-live-replay.js <source.slp> <destFolder> [--chunk N] [--interval MS] [--name file.slp]");
    process.exit(1);
  }
  if (!fs.existsSync(source)) {
    console.error(`Source not found: ${source}`);
    process.exit(1);
  }
  fs.mkdirSync(destFolder, { recursive: true });

  const bytes = fs.readFileSync(source);
  const dest = path.join(destFolder, opts.name);
  fs.writeFileSync(dest, Buffer.alloc(0));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const total = bytes.length;
  let written = 0;

  console.log(`Streaming ${total} bytes → ${dest} (${opts.chunk}B every ${opts.interval}ms)`);
  while (written < total) {
    const next = Math.min(written + opts.chunk, total);
    fs.appendFileSync(dest, bytes.subarray(written, next));
    written = next;
    process.stdout.write(`\r  ${written}/${total} bytes (${Math.round((written / total) * 100)}%)`);
    await sleep(opts.interval);
  }
  process.stdout.write("\n");
  console.log("Done — file is complete. The live monitor should now show FINAL.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
