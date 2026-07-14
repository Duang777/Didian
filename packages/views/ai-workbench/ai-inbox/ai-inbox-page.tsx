"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Inbox, RefreshCw, Sparkles, SendHorizontal } from "lucide-react";
import { browserCapturesOptions } from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { Button } from "@didian/ui/components/ui/button";
import { Textarea } from "@didian/ui/components/ui/textarea";
import {
  browserCaptureRecordToInboxInput,
  inferAiUnderstanding,
} from "../fixtures";
import { WorkbenchSection, WorkbenchShell, MetricPill } from "../workbench-shell";

const createMissionLabel = "创建 Mission";
const saveToAtlasLabel = "保存到 Atlas";
const captureCurrentPageLabel = "使用扩展收藏当前页";

export function AiInboxPage() {
  const wsId = useWorkspaceId();
  const [input, setInput] = useState("https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。");
  const understanding = useMemo(() => inferAiUnderstanding(input), [input]);
  const capturesQuery = useQuery({
    ...browserCapturesOptions(wsId, { limit: 12, offset: 0, state: "active" }),
    refetchInterval: 5_000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const inboxInputs = useMemo(
    () => (capturesQuery.data?.captures ?? []).map(browserCaptureRecordToInboxInput),
    [capturesQuery.data?.captures],
  );

  return (
    <WorkbenchShell
      icon={Inbox}
      title="AI Inbox"
      description="把链接、文本、浏览器标签或一个想法丢进来。AI 会先解释它理解到的意图，再建议创建 Mission。"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <WorkbenchSection title="输入" description="第一版支持 URL、文本和浏览器 capture；文件后续会走同一输入模型。">
          <Textarea
            aria-label="AI Inbox input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-40 resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm">
              <SendHorizontal className="size-3.5" />
              {createMissionLabel}
            </Button>
            <Button size="sm" variant="outline">{saveToAtlasLabel}</Button>
            <Button size="sm" variant="ghost" type="button">{captureCurrentPageLabel}</Button>
          </div>
        </WorkbenchSection>

        <WorkbenchSection title="AI 理解" description="当前是启发式理解，后续可替换为真实 AI provider。">
          <div className="grid grid-cols-2 gap-2">
            <MetricPill label="意图" value={understanding.intent} />
            <MetricPill label="置信度" value={`${Math.round(understanding.confidence * 100)}%`} />
          </div>
          <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-muted-foreground" />
              {understanding.suggestedMissionTitle}
            </div>
            <p className="mt-2 text-muted-foreground">{understanding.summary}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {understanding.suggestedOutputs.map((output) => (
              <span key={output} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">{output}</span>
            ))}
          </div>
        </WorkbenchSection>
      </div>

      <WorkbenchSection title="输入卡片" description="输入会被拆成可追踪来源，后续 Mission 和 Atlas 都会保留这些证据。">
        {capturesQuery.isLoading ? (
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground" role="status">正在读取浏览器收藏…</div>
        ) : capturesQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background p-3 text-sm text-muted-foreground" role="alert">
            <span>浏览器收藏暂时读取失败，请稍后重试。</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>
        ) : inboxInputs.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <span>暂无浏览器收藏。安装 Didian 扩展后，收藏的真实页面会出现在这里。</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {inboxInputs.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-md border bg-background transition-colors hover:border-foreground/20 hover:bg-muted/20">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block min-h-40 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`打开收藏页面：${item.title}`}
                >
                  {(item.previewImageUrl || item.faviconUrl) && (
                    <div className="pointer-events-none absolute right-3 top-3 flex size-16 items-center justify-center overflow-hidden rounded-md border bg-background/60 opacity-20 blur-[0.2px]">
                      <img
                        src={item.previewImageUrl ?? item.faviconUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="size-full object-contain p-2"
                      />
                    </div>
                  )}
                  <div className="relative flex items-start justify-between gap-3 pr-12">
                    <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">{item.title}</h3>
                    <span className="shrink-0 rounded-sm border bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground">{item.sourceLabel ?? "收藏"}</span>
                  </div>
                  <p className="relative mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.preview}</p>
                  {item.source && (
                    <p className="relative mt-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span className="truncate font-mono">{item.source}</span>
                    </p>
                  )}
                </a>
              </article>
            ))}
          </div>
        )}
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
