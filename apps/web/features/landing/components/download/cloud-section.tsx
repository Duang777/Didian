"use client";

import { useState } from "react";
import { CloudWaitlistExpand } from "@didian/views/onboarding";
import { useLocale } from "../../i18n";
import { LandingSectionShell } from "../shared";

/**
 * Cloud runtime waitlist — thin wrapper around the shared
 * CloudWaitlistExpand form with a download-page-appropriate title
 * and subtitle. Submission persists via `joinCloudWaitlist` inside
 * the child; the submitted flag here only prevents double-submits
 * for the lifetime of the page.
 */
export function CloudSection() {
  const { t } = useLocale();
  const d = t.download.cloud;
  const [submitted, setSubmitted] = useState(false);

  return (
    <LandingSectionShell grid={false}>
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-serif)] text-[2.2rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          {d.title}
        </h2>
        <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-white/62">
          {d.sub}
        </p>

        <div className="mt-10 rounded-[8px] border border-white/12 bg-white/[0.035] p-4 sm:p-6">
          <CloudWaitlistExpand
            submitted={submitted}
            onSubmitted={() => setSubmitted(true)}
            variant="dark"
          />
        </div>
      </div>
    </LandingSectionShell>
  );
}
