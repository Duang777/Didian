"use client";

import { useMemo, useState } from "react";
import { Inbox, Sparkles, SendHorizontal } from "lucide-react";
import { Button } from "@didian/ui/components/ui/button";
import { Textarea } from "@didian/ui/components/ui/textarea";
import { demoInboxInputs, inferAiUnderstanding } from "../fixtures";
import { WorkbenchSection, WorkbenchShell, MetricPill } from "../workbench-shell";

export function AiInboxPage() {
  const [input, setInput] = useState("https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。");
  const understanding = useMemo(() => inferAiUnderstanding(input), [input]);

  return (
    <WorkbenchShell
      icon={Inbox}
      title="AI Inbox"
      description="把链接、文本、浏览器标签或一个想法丢进来。AI 会先解释它理解到的意图，再建议创建 Mission。"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <WorkbenchSection title="输入" description="第一版支持 URL 和文本；文件与浏览器 capture 会走同一输入模型。">
          <Textarea
            aria-label="AI Inbox input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-40 resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm">
              <SendHorizontal className="size-3.5" />
              创建 Mission
            </Button>
            <Button size="sm" variant="outline">保存到 Atlas</Button>
            <Button size="sm" variant="ghost">重新理解</Button>
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
        <div className="grid gap-2 md:grid-cols-3">
          {demoInboxInputs.map((item) => (
            <article key={item.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-medium">{item.title}</h3>
                <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{item.kind}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.preview}</p>
              {item.source && <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{item.source}</p>}
            </article>
          ))}
        </div>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
