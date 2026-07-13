"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { useAuthStore } from "@didian/core/auth";
import { useLocale } from "../i18n";
import {
  ClaudeCodeLogo,
  CodexLogo,
  GeminiCliLogo,
  OpenClawLogo,
  OpenCodeLogo,
  heroButtonClassName,
} from "./shared";

export function LandingHero() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="relative min-h-full overflow-hidden bg-white text-[#0a0d12]">
      <LandingBackdrop />

      <main className="relative z-10">
        <section
          id="product"
          className="mx-auto max-w-[1320px] px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-24 lg:pt-36"
        >
          <div className="mx-auto max-w-[1120px] text-center">
            <h1 className="font-[family-name:var(--font-serif)] text-[3.65rem] leading-[0.93] tracking-[-0.038em] text-[#0a0d12] sm:text-[4.85rem] lg:text-[6.4rem]">
              {t.hero.headlineLine1}
              <br />
              {t.hero.headlineLine2}
            </h1>

            <p className="mx-auto mt-7 max-w-[820px] text-[15px] leading-7 text-[#0a0d12]/72 sm:text-[17px]">
              {t.hero.subheading}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={user ? "/" : "/login"} className={heroButtonClassName("solid", "light")}>
                {user ? t.header.dashboard : t.hero.cta}
              </Link>
              <Link
                href="/download"
                className={heroButtonClassName("ghost", "light")}
              >
                <Download className="size-4" aria-hidden />
                {t.hero.downloadDesktop}
              </Link>
              <Link
                href="/contact-sales"
                className="group inline-flex items-center justify-center gap-1.5 rounded-[12px] px-3 py-3 text-[14px] font-semibold text-[#0a0d12]/62 transition-colors hover:text-[#0a0d12]"
              >
                {t.hero.talkToSales}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <span className="text-[15px] text-[#0a0d12]/46">
              {t.hero.worksWith}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2.5 text-[#0a0d12]/70">
                <ClaudeCodeLogo className="size-5" />
                <span className="text-[15px] font-medium">Claude Code</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#0a0d12]/70">
                <CodexLogo className="size-5" />
                <span className="text-[15px] font-medium">Codex</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#0a0d12]/70">
                <GeminiCliLogo className="size-5" />
                <span className="text-[15px] font-medium">Gemini CLI</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#0a0d12]/70">
                <OpenClawLogo className="size-5" />
                <span className="text-[15px] font-medium">OpenClaw</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#0a0d12]/70">
                <OpenCodeLogo className="size-5" />
                <span className="text-[15px] font-medium">OpenCode</span>
              </div>
            </div>
          </div>

          <div id="preview" className="mt-10 sm:mt-12">
            <ProductImage alt={t.hero.imageAlt} />
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Image
        src="/images/landing-bg.jpg"
        alt=""
        fill
        className="object-cover object-center"
        priority
        quality={92}
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-white/18" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white/88" />
    </div>
  );
}

function ProductImage({ alt }: { alt: string }) {
  return (
    <div>
      <div className="relative overflow-hidden border border-[#0a0d12]/10 shadow-[0_24px_80px_rgba(10,13,18,0.14)]">
        <Image
          src="/images/landing-hero.png"
          alt={alt}
          width={3532}
          height={2382}
          priority
          className="block h-auto w-full"
          sizes="(max-width: 1320px) 100vw, 1320px"
          quality={85}
        />
      </div>
    </div>
  );
}
