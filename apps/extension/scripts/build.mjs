import { mkdir, copyFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const appRoot = join(root, "..");
const dist = join(appRoot, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "popup"), { recursive: true });

await build({
  entryPoints: {
    background: join(appRoot, "src/background.ts"),
    content: join(appRoot, "src/content/index.ts"),
    "popup/popup": join(appRoot, "src/popup/popup.ts"),
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
  outdir: dist,
  sourcemap: true,
  logLevel: "info",
});

await copyFile(join(appRoot, "src/manifest.json"), join(dist, "manifest.json"));
await copyFile(join(appRoot, "src/popup/index.html"), join(dist, "popup/index.html"));
await copyFile(join(appRoot, "src/popup/popup.css"), join(dist, "popup/popup.css"));
