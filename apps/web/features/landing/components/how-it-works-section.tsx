"use client";

import Link from "next/link";
import { useAuthStore } from "@didian/core/auth";
import { docsHrefForLocale, useLocale } from "../i18n";
import {
  GitHubMark,
  githubUrl,
  heroButtonClassName,
} from "./shared";

export function HowItWorksSection() {
  const { t, locale } = useLocale();
  const user = useAuthStore((s) => s.user);

  return (
    <section id="how-it-works" className="bg-white text-[#0a0d12]">
      <div className="mx-auto max-w-[1320px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0d12]/40">
          {t.howItWorks.label}
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-serif)] text-[2.6rem] leading-[1.05] tracking-[-0.03em] sm:text-[3.4rem] lg:text-[4.2rem]">
          {t.howItWorks.headlineMain}
          <br />
          <span className="text-[#0a0d12]/36">{t.howItWorks.headlineFaded}</span>
        </h2>

        <div className="mt-20 grid gap-px overflow-hidden rounded-[8px] border border-[#0a0d12]/8 bg-[#0a0d12]/8 shadow-[0_24px_80px_rgba(10,13,18,0.08)] sm:grid-cols-2 lg:grid-cols-4">
          {t.howItWorks.steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col bg-white p-8 lg:p-10"
            >
              <span className="text-[13px] font-semibold tabular-nums text-[#0a0d12]/28">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#0a0d12] sm:text-[18px]">
                {step.title}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#0a0d12]/56 sm:text-[15px]">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link href={user ? "/" : "/login"} className={heroButtonClassName("solid", "light")}>
            {user ? t.header.dashboard : t.howItWorks.cta}
          </Link>
          <Link
            href={docsHrefForLocale(locale)}
            className={heroButtonClassName("ghost", "light")}
          >
            {t.howItWorks.ctaDocs}
          </Link>
          <Link
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className={heroButtonClassName("ghost", "light")}
          >
            <GitHubMark className="size-4" />
            {t.howItWorks.ctaGithub}
          </Link>
        </div>
      </div>
    </section>
  );
}
