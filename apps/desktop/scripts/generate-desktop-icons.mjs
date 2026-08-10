#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "../..");

const out = {
  build: join(desktopRoot, "build"),
  resources: join(desktopRoot, "resources"),
  linuxIcons: join(desktopRoot, "build", "icons"),
  iconset: join(desktopRoot, "build", "Didian.iconset"),
};

const DIDIAN_PATH =
  "M51 8c5 0 9 4 9 9v46c0 5-4 9-9 9H35C18.5 72 7 59 7 40S18.5 8 35 8h16Zm-16 17c-8.2 0-13.5 6-13.5 15S26.8 55 35 55h10V25H35Z";

function brandIconSvg(size) {
  const markBounds = {
    left: 7,
    right: 60,
    top: 8,
    bottom: 72,
  };
  const markScale = size * 0.00915;
  const markCenterX = (markBounds.left + markBounds.right) / 2;
  const markCenterY = (markBounds.top + markBounds.bottom) / 2;
  const markX = size / 2 - markCenterX * markScale;
  const markY = size / 2 - markCenterY * markScale;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.62" stop-color="#f7f6f2"/>
      <stop offset="1" stop-color="#ece9e2"/>
    </linearGradient>
    <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.018}" stdDeviation="${size * 0.026}" flood-color="#000000" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect x="${size * 0.07}" y="${size * 0.07}" width="${size * 0.86}" height="${size * 0.86}" rx="${size * 0.19}" fill="url(#tile)" filter="url(#tileShadow)"/>
  <rect x="${size * 0.088}" y="${size * 0.088}" width="${size * 0.824}" height="${size * 0.824}" rx="${size * 0.168}" fill="none" stroke="#d9d6ce" stroke-width="${Math.max(1.5, size * 0.008)}"/>
  <g transform="translate(${markX} ${markY}) scale(${markScale})">
    <path d="${DIDIAN_PATH}" fill="#111111" fill-rule="evenodd" clip-rule="evenodd"/>
  </g>
</svg>`;
}

async function renderPng(size, path) {
  const buffer = await sharp(Buffer.from(brandIconSvg(size)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(path, buffer);
  return buffer;
}

function writeIco(path, images) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * images.length;
  const entries = [];

  for (const image of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.buffer.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  writeFileSync(path, Buffer.concat([header, ...entries, ...images.map((i) => i.buffer)]));
}

async function main() {
  mkdirSync(out.build, { recursive: true });
  mkdirSync(out.resources, { recursive: true });
  mkdirSync(out.linuxIcons, { recursive: true });

  await renderPng(1024, join(out.resources, "icon.png"));
  await renderPng(1024, join(out.build, "icon.png"));

  const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  for (const size of linuxSizes) {
    await renderPng(size, join(out.linuxIcons, `${size}x${size}.png`));
  }

  rmSync(out.iconset, { recursive: true, force: true });
  mkdirSync(out.iconset, { recursive: true });
  const iconsetSpecs = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];
  for (const [name, size] of iconsetSpecs) {
    await renderPng(size, join(out.iconset, name));
  }

  if (process.platform === "darwin" && existsSync("/usr/bin/iconutil")) {
    execFileSync("/usr/bin/iconutil", [
      "-c",
      "icns",
      out.iconset,
      "-o",
      join(out.build, "icon.icns"),
    ]);
  } else {
    console.warn("[brand:icons] skipped icon.icns generation; iconutil is only available on macOS.");
  }
  rmSync(out.iconset, { recursive: true, force: true });

  const icoImages = [];
  for (const size of [16, 24, 32, 48, 64, 128, 256]) {
    icoImages.push({ size, buffer: await sharp(Buffer.from(brandIconSvg(size))).png().toBuffer() });
  }
  writeIco(join(out.build, "icon.ico"), icoImages);

  console.log(`[brand:icons] generated Didian desktop icons in ${repoRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
