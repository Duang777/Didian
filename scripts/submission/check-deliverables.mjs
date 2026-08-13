#!/usr/bin/env node
import { access, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["product document", "docs/submission/product-overview.md"],
  ["recording plan", "docs/submission/recording-plan.md"],
  ["submission checklist", "docs/submission/submission-checklist.md"],
  ["recording script", "scripts/submission/record-demo.mjs"],
];

let failed = false;

for (const [label, relative] of checks) {
  const target = path.join(root, relative);
  try {
    const info = await stat(target);
    console.log(`ok  ${label}: ${relative} (${info.size} bytes)`);
  } catch {
    failed = true;
    console.error(`missing ${label}: ${relative}`);
  }
}

for (const relative of [
  "tmp/submission/didian-product-demo.mp4",
  "apps/desktop/dist",
]) {
  try {
    await access(path.join(root, relative));
    console.log(`ok  optional generated artifact exists: ${relative}`);
  } catch {
    console.log(`todo optional generated artifact not found yet: ${relative}`);
  }
}

if (failed) process.exit(1);
