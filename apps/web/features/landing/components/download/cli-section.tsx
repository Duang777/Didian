"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { copyText } from "@didian/ui/lib/clipboard";
import { useLocale } from "../../i18n";
import { LandingSectionShell } from "../shared";

const INSTALL_CMD =
  "curl -fsSL https://raw.githubusercontent.com/didian-ai/didian/main/scripts/install.sh | bash";
const SETUP_CMD = "didian setup";

/**
 * Scenario-first CLI section. Copy leans into servers / remote dev
 * boxes / headless setups rather than positioning CLI as a
 * lightweight Desktop. Two copy-and-paste command blocks.
 */
export function CliSection() {
  const { t } = useLocale();
  const d = t.download.cli;

  return (
    <LandingSectionShell id="cli" grid={false}>
      <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-serif)] text-[2.2rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          {d.title}
        </h2>
        <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-white/62">
          {d.sub}
        </p>

        <div className="mt-10 flex flex-col gap-5">
          <CommandBlock
            label={d.installLabel}
            cmd={INSTALL_CMD}
            copyLabel={d.copyLabel}
            copiedLabel={d.copiedLabel}
          />
          <CommandBlock
            label={d.startLabel}
            cmd={SETUP_CMD}
            copyLabel={d.copyLabel}
            copiedLabel={d.copiedLabel}
          />
        </div>

        <p className="mt-6 text-[13px] text-white/48">{d.sshNote}</p>
      </div>
    </LandingSectionShell>
  );
}

function CommandBlock({
  label,
  cmd,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  cmd: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (await copyText(cmd)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#f2b15f]/70">
        {label}
      </p>
      <div className="flex items-start gap-3 rounded-[8px] border border-white/12 bg-[#07100d]/95 px-4 py-3 font-mono text-[13.5px] text-white shadow-[0_18px_60px_rgba(0,0,0,0.26)]">
        <Terminal
          className="mt-0.5 size-4 shrink-0 text-[#73d8c5]/70"
          aria-hidden
        />
        <code className="min-w-0 flex-1 whitespace-pre-wrap break-all">
          {cmd}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? copiedLabel : copyLabel}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-white/68 transition-colors hover:bg-white/8 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              {copyLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
