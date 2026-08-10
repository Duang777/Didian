import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  appSuffixForPath,
  applyDesktopRuntimeEnv,
  applyWorktreeDevEnv,
  cksum,
  offsetForPath,
  rendererPortForPath,
} from "./worktree-dev-env.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function tmpRoot(kind /* "file" | "dir" | "none" */) {
  const root = mkdtempSync(join(tmpdir(), "wt-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  if (kind === "file") writeFileSync(join(root, ".git"), "gitdir: /elsewhere\n");
  else if (kind === "dir") mkdirSync(join(root, ".git"));
  return root;
}

describe("worktree-dev-env", () => {
  it("cksum is byte-compatible with coreutils cksum(1)", () => {
    // `printf '%s' "/tmp/foo" | cksum` → 427878967 8
    expect(cksum(Buffer.from("/tmp/foo"))).toBe(427878967);
    // `printf '' | cksum` → 4294967295 0
    expect(cksum(Buffer.from(""))).toBe(4294967295);
  });

  it("derives the offset from the path, mod 1000", () => {
    expect(offsetForPath("/tmp/foo")).toBe(427878967 % 1000);
  });

  it("renderer port is 5174 + offset (5173 reserved for the primary checkout)", () => {
    expect(rendererPortForPath("/tmp/foo")).toBe(5174 + (427878967 % 1000));
  });

  it("never reuses 5173 even when the offset is 0", () => {
    // POSIX cksum("/tmp/didian-1987") === 1423423000, % 1000 === 0
    expect(offsetForPath("/tmp/didian-1987")).toBe(0);
    expect(rendererPortForPath("/tmp/didian-1987")).toBe(5174);
    expect(rendererPortForPath("/tmp/didian-1987")).not.toBe(5173);
  });

  it("suffix is '<folder>-<offset>' so it stays recognizable and unique", () => {
    expect(appSuffixForPath("/work/MUL-3724_Desktop")).toBe(
      `mul-3724-desktop-${offsetForPath("/work/MUL-3724_Desktop")}`,
    );
    expect(appSuffixForPath("/work/feat/some thing")).toBe(
      `some-thing-${offsetForPath("/work/feat/some thing")}`,
    );
    // empty/non-ascii slug falls back to "worktree", still disambiguated by offset
    expect(appSuffixForPath("/work/___")).toBe(`worktree-${offsetForPath("/work/___")}`);
  });

  it("disambiguates worktrees that share a folder name at different paths", () => {
    // Same basename "didian", different parent dirs → different offsets/suffixes,
    // so each gets its own single-instance lock.
    expect(offsetForPath("/tmp/a/didian")).not.toBe(offsetForPath("/tmp/b/didian"));
    expect(appSuffixForPath("/tmp/a/didian")).not.toBe(
      appSuffixForPath("/tmp/b/didian"),
    );
  });

  it("auto-isolates a linked worktree (.git is a file)", () => {
    const root = tmpRoot("file");
    const env = {};
    applyWorktreeDevEnv(env, { root });
    expect(env.DESKTOP_RENDERER_PORT).toBe(String(rendererPortForPath(root)));
    expect(env.DESKTOP_APP_SUFFIX).toBe(appSuffixForPath(root));
  });

  it("leaves the primary checkout untouched (.git is a dir)", () => {
    const root = tmpRoot("dir");
    const env = {};
    applyWorktreeDevEnv(env, { root });
    expect(env.DESKTOP_RENDERER_PORT).toBeUndefined();
    expect(env.DESKTOP_APP_SUFFIX).toBeUndefined();
  });

  it("respects explicit env overrides", () => {
    const root = tmpRoot("file");
    const env = { DESKTOP_RENDERER_PORT: "9999", DESKTOP_APP_SUFFIX: "manual" };
    applyWorktreeDevEnv(env, { root });
    expect(env.DESKTOP_RENDERER_PORT).toBe("9999");
    expect(env.DESKTOP_APP_SUFFIX).toBe("manual");
  });

  it("fills only the missing knob when one is set explicitly", () => {
    const root = tmpRoot("file");
    const env = { DESKTOP_RENDERER_PORT: "9999" };
    applyWorktreeDevEnv(env, { root });
    expect(env.DESKTOP_RENDERER_PORT).toBe("9999");
    expect(env.DESKTOP_APP_SUFFIX).toBe(appSuffixForPath(root));
  });

  it("loads desktop runtime URLs from .env.worktree", () => {
    const root = mkdtempSync(join(tmpdir(), "wt-env-"));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(
      join(root, ".env.worktree"),
      [
        "PORT=18957",
        "NEXT_PUBLIC_API_URL=http://localhost:18957",
        "NEXT_PUBLIC_WS_URL=ws://localhost:18957/ws",
        "DIDIAN_APP_URL=http://localhost:13877",
      ].join("\n"),
    );

    const env = {};
    applyDesktopRuntimeEnv(env, { root });
    expect(env.VITE_API_URL).toBe("http://localhost:18957");
    expect(env.VITE_WS_URL).toBe("ws://localhost:18957/ws");
    expect(env.VITE_APP_URL).toBe("http://localhost:13877");
  });

  it("keeps explicit runtime URLs when they are already set", () => {
    const root = mkdtempSync(join(tmpdir(), "wt-env-explicit-"));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(
      join(root, ".env.worktree"),
      "NEXT_PUBLIC_API_URL=http://localhost:18957\nDIDIAN_APP_URL=http://localhost:13877\n",
    );

    const env = {
      VITE_API_URL: "http://localhost:29999",
      VITE_WS_URL: "ws://localhost:29999/ws",
      VITE_APP_URL: "http://localhost:39999",
    };
    applyDesktopRuntimeEnv(env, { root });
    expect(env.VITE_API_URL).toBe("http://localhost:29999");
    expect(env.VITE_WS_URL).toBe("ws://localhost:29999/ws");
    expect(env.VITE_APP_URL).toBe("http://localhost:39999");
  });
});
