import { describe, expect, it } from "vitest";
import type { BrowserCapture } from "./types";
import { inferSkillOpportunity } from "./skill-opportunities";

function captureFixture(overrides: Partial<BrowserCapture> = {}): BrowserCapture {
  return {
    id: "capture-1",
    workspace_id: "ws-test",
    creator_id: "user-1",
    source_type: "link",
    source: "extension",
    capture_scope: "page",
    source_tab_id: null,
    url: "https://docs.stripe.com/payments/checkout",
    normalized_url: "https://docs.stripe.com/payments/checkout",
    title: "Stripe Checkout documentation",
    domain: "docs.stripe.com",
    favicon_url: null,
    description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
    preview_image_url: null,
    selected_text: null,
    readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
    links: [],
    status: "captured",
    metadata_status: "success",
    archive_status: "skipped",
    summary_status: "success",
    embedding_status: "skipped",
    memory_state: "active",
    failure_reason: null,
    memory: {
      summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
      one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
      key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
      topics: ["api", "payments", "checkout"],
      entities: ["Stripe"],
      keywords: ["api", "sdk", "webhook", "error"],
      status: "ready",
      generated_at: "2026-07-14T02:41:00.000Z",
      updated_at: "2026-07-14T02:41:00.000Z",
    },
    captured_at: "2026-07-14T02:40:00.000Z",
    created_at: "2026-07-14T02:40:00.000Z",
    updated_at: "2026-07-14T02:40:00.000Z",
    ...overrides,
  };
}

describe("inferSkillOpportunity", () => {
  it("suggests an API integration skill for technical docs", () => {
    const opportunity = inferSkillOpportunity(captureFixture());

    expect(opportunity).toMatchObject({
      shouldSuggest: true,
      pageType: "technical_doc",
      proposedTitle: "Stripe Checkout 接入助手",
    });
    expect(opportunity?.confidence).toBeGreaterThanOrEqual(0.75);
    expect(opportunity?.proposedCapability).toContain("接入步骤");
    expect(opportunity?.evidenceSnippets.length).toBeGreaterThanOrEqual(2);
  });

  it("suggests a repo evaluation skill for GitHub repositories", () => {
    const opportunity = inferSkillOpportunity(captureFixture({
      url: "https://github.com/browser-use/browser-use",
      normalized_url: "https://github.com/browser-use/browser-use",
      title: "browser-use/browser-use",
      domain: "github.com",
      description: "Make websites accessible for AI agents.",
      readable_text: "README includes installation, quickstart, examples, contributing notes, license, and troubleshooting.",
      memory: {
        summary: "Open source browser automation repository with installation, examples, and integration guidance.",
        one_line_takeaway: "Browser automation repo for AI agents with install and examples.",
        key_points: ["Install the package and run the quickstart.", "Review license and integration risks."],
        topics: ["github", "automation"],
        entities: ["browser-use"],
        keywords: ["github", "install", "license", "quickstart"],
        status: "ready",
        generated_at: "2026-07-14T02:41:00.000Z",
        updated_at: "2026-07-14T02:41:00.000Z",
      },
    }));

    expect(opportunity).toMatchObject({
      shouldSuggest: true,
      pageType: "github_repo",
      proposedTitle: "browser-use/browser-use 尽调助手",
    });
    expect(opportunity?.expectedOutputs).toContain("采用建议");
  });

  it("suggests a workflow skill for tutorials", () => {
    const opportunity = inferSkillOpportunity(captureFixture({
      url: "https://example.com/tutorials/nextjs-auth",
      normalized_url: "https://example.com/tutorials/nextjs-auth",
      title: "How to configure Next.js authentication",
      domain: "example.com",
      description: "A step by step tutorial for setting up callback URLs, environment variables, and tests.",
      readable_text: "Step 1 install packages. Step 2 configure environment variables. Step 3 test the login flow and troubleshoot errors.",
      memory: {
        summary: "Tutorial with step-by-step setup, configuration, tests, and troubleshooting.",
        one_line_takeaway: "Next.js auth setup tutorial with configuration checklist.",
        key_points: ["Install packages.", "Configure environment variables.", "Test and troubleshoot errors."],
        topics: ["next.js", "auth", "tutorial"],
        entities: ["Next.js"],
        keywords: ["tutorial", "step", "configure", "test"],
        status: "ready",
        generated_at: "2026-07-14T02:41:00.000Z",
        updated_at: "2026-07-14T02:41:00.000Z",
      },
    }));

    expect(opportunity).toMatchObject({
      shouldSuggest: true,
      pageType: "tutorial",
      proposedTitle: "Next.js Auth 配置助手",
    });
  });

  it("does not suggest skills for ordinary blog or product pages", () => {
    const blogOpportunity = inferSkillOpportunity(captureFixture({
      url: "https://example.com/blog/my-opinion-about-ai",
      normalized_url: "https://example.com/blog/my-opinion-about-ai",
      title: "My opinion about AI tools",
      domain: "example.com",
      description: "A personal essay about AI tools and taste.",
      readable_text: "This post shares opinions, impressions, and reflections without a repeatable workflow.",
      memory: {
        summary: "A personal opinion article about AI tools.",
        one_line_takeaway: "A reflective blog post.",
        key_points: ["AI tools are changing creative work."],
        topics: ["blog"],
        entities: [],
        keywords: ["opinion", "essay"],
        status: "ready",
        generated_at: "2026-07-14T02:41:00.000Z",
        updated_at: "2026-07-14T02:41:00.000Z",
      },
    }));
    const productOpportunity = inferSkillOpportunity(captureFixture({
      url: "https://example.com/pricing",
      normalized_url: "https://example.com/pricing",
      title: "Acme product pricing",
      domain: "example.com",
      description: "Marketing page for product plans and pricing.",
      readable_text: "Choose a plan for your team. Enterprise customers can contact sales.",
      memory: null,
    }));

    expect(blogOpportunity).toBeNull();
    expect(productOpportunity).toBeNull();
  });
});
