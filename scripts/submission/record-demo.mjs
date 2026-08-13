#!/usr/bin/env node
import { mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { chromium } from "playwright";
import pg from "pg";

const execFileAsync = promisify(execFile);

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "tmp", "submission");
const webmPath = path.join(outputDir, "didian-product-demo.webm");
const mp4Path = path.join(outputDir, "didian-product-demo.mp4");

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.FRONTEND_ORIGIN || "http://localhost:13877";
const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18957";
const databaseURL =
  process.env.DATABASE_URL || "postgres://multica:multica@localhost:5432/multica?sslmode=disable";

const email = process.env.SUBMISSION_DEMO_EMAIL || "submission-demo@didian.ai";
const workspaceName = process.env.SUBMISSION_DEMO_WORKSPACE || "Didian Submission Demo";
const workspaceSlug = process.env.SUBMISSION_DEMO_WORKSPACE_SLUG || "didian-submission-demo";

async function fetchJSON(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init?.method || "GET"} ${url} failed: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function loginAndSeed() {
  const client = new pg.Client(databaseURL);
  await client.connect();
  try {
    await client.query("DELETE FROM verification_code WHERE email = $1", [email]);

    await fetchJSON(`${apiBase}/auth/send-code`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const result = await client.query(
      "SELECT code FROM verification_code WHERE email = $1 AND used = FALSE ORDER BY created_at DESC LIMIT 1",
      [email],
    );
    if (result.rows.length === 0) {
      throw new Error(`No verification code found for ${email}`);
    }
    const code = process.env.DIDIAN_DEV_VERIFICATION_CODE?.trim() || result.rows[0].code;
    const verified = await fetchJSON(`${apiBase}/auth/verify-code`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    const token = verified.token;
    if (!token) throw new Error("verify-code did not return token");

    await client.query(
      `
        UPDATE "user"
        SET
          name = COALESCE(NULLIF(name, ''), 'Submission Demo'),
          onboarded_at = COALESCE(onboarded_at, now()),
          onboarding_questionnaire = COALESCE(onboarding_questionnaire, '{}'::jsonb)
            || '{"source":["submission_demo"],"source_skipped":false}'::jsonb
        WHERE email = $1
      `,
      [email],
    );

    let workspaces = await fetchJSON(`${apiBase}/api/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let workspace = workspaces.find((item) => item.slug === workspaceSlug);
    if (!workspace) {
      try {
        workspace = await fetchJSON(`${apiBase}/api/workspaces`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: workspaceName, slug: workspaceSlug }),
        });
      } catch (err) {
        if (!String(err.message || err).includes("409")) throw err;
        const fallbackSlug = `${workspaceSlug}-${Date.now().toString(36)}`;
        workspace = await fetchJSON(`${apiBase}/api/workspaces`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: workspaceName, slug: fallbackSlug }),
        });
      }
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "X-Workspace-Slug": workspace.slug,
    };
    const missions = await fetchJSON(`${apiBase}/api/issues?include_closed=true`, { headers });
    const missionTitle = "整理我收藏的 AI Agent 学习资源";
    const hasMission = Array.isArray(missions?.issues)
      ? missions.issues.some((item) => item.title === missionTitle)
      : false;
    if (!hasMission) {
      await fetchJSON(`${apiBase}/api/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: missionTitle,
          description:
            "把最近收藏的 AI Agent、浏览器自动化和工作流资料整理成一份可复用的学习路线，并标注哪些内容适合沉淀成能力。",
          status: "todo",
          priority: "medium",
          allow_duplicate: true,
        }),
      });
    }

    return { token, workspaceSlug: workspace.slug };
  } finally {
    await client.end();
  }
}

async function gotoAndHold(page, url, label, hold = 1800) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(hold);
  await page.evaluate((text) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.body.setAttribute("data-demo-scene", text);
  }, label);
}

async function convertToMP4() {
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      webmPath,
      "-vf",
      "scale=1920:-2",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Path,
    ]);
  } catch (err) {
    console.warn(`[record-demo] ffmpeg conversion failed; WebM is still available at ${webmPath}`);
    console.warn(err.stderr || err.message);
    return false;
  }
  return true;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const health = await fetch(`${apiBase}/health`).catch(() => null);
  if (!health?.ok && health?.status !== 405) {
    throw new Error(`Backend is not reachable at ${apiBase}. Start the app with make start-worktree first.`);
  }

  const { token, workspaceSlug: slug } = await loginAndSeed();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);

  await page.addInitScript((authToken) => {
    localStorage.setItem("didian_token", authToken);
    localStorage.setItem("didian:chat:isOpen", "false");
  }, token);

  await gotoAndHold(page, `/`, "app-root", 1200);
  await gotoAndHold(page, `/${slug}`, "workspace-home", 1600);
  await gotoAndHold(page, `/${slug}/ai-inbox`, "ai-inbox", 2400);
  await gotoAndHold(page, `/${slug}/skills`, "capability-library", 2200);
  await gotoAndHold(page, `/${slug}/missions`, "missions", 2200);
  await page.waitForTimeout(2200);
  await gotoAndHold(page, `/${slug}/atlas`, "atlas", 2400);

  const video = page.video();
  await context.close();
  await browser.close();

  const actualVideoPath = video ? await video.path() : null;
  if (!actualVideoPath) {
    throw new Error("Playwright did not produce a recording");
  }
  await execFileAsync("mv", [actualVideoPath, webmPath]);
  await convertToMP4();

  const webmStat = await stat(webmPath);
  console.log(`[record-demo] wrote ${webmPath} (${Math.round(webmStat.size / 1024)} KB)`);
  try {
    const mp4Stat = await stat(mp4Path);
    console.log(`[record-demo] wrote ${mp4Path} (${Math.round(mp4Stat.size / 1024)} KB)`);
  } catch {
    // Conversion failure already logged.
  }
}

main().catch((err) => {
  console.error(`[record-demo] ${err.stack || err.message}`);
  process.exit(1);
});
