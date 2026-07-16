"use client";

import Link from "next/link";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
import { cn } from "@didian/ui/lib/utils";
import { useAuthStore } from "@didian/core/auth";
import {
  XMark,
  GitHubMark,
  DiscordMark,
  githubUrl,
  twitterUrl,
  discordUrl,
} from "./shared";
import { useLocale, locales, localeLabels } from "../i18n";

export function LandingFooter() {
  const { t, locale, setLocale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const groups = Object.values(t.footer.groups);

  return (
    <footer className="relative overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#efaa52]/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(115,216,197,0.1),transparent_28%)]" />
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Top: CTA + link columns */}
        <div className="relative flex flex-col gap-12 border-b border-white/10 py-16 sm:py-20 lg:flex-row lg:gap-20">
          {/* Left — newsletter / CTA */}
          <div className="lg:w-[340px] lg:shrink-0">
            <Link href="#product" className="flex items-center gap-3">
              <DidianIcon className="size-5 text-white" noSpin />
              <span className="text-[18px] font-semibold tracking-[0.04em] lowercase">
                didian
              </span>
            </Link>
            <p className="mt-4 max-w-[300px] text-[14px] leading-[1.7] text-white/50 sm:text-[15px]">
              {t.footer.tagline}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white/40 transition-colors hover:text-white"
              >
                <XMark className="size-4" />
              </Link>
              <Link
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white/40 transition-colors hover:text-white"
              >
                <GitHubMark className="size-4" />
              </Link>
              <Link
                href={discordUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="text-white/40 transition-colors hover:text-white"
              >
                <DiscordMark className="size-4" />
              </Link>
            </div>
            <div className="mt-6">
              <Link
                href={user ? "/" : "/login"}
                className="inline-flex items-center justify-center rounded-[11px] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a0d12] transition-colors hover:bg-white/88"
              >
                {user ? t.header.dashboard : t.footer.cta}
              </Link>
            </div>
          </div>

          {/* Right — link columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <div key={group.label}>
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  {group.label}
                </h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                        className="text-[14px] text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright + language switcher */}
        <div className="relative flex items-center justify-between py-6">
          <p className="text-[13px] text-white/36">
            {t.footer.copyright.replace(
              "{year}",
              String(new Date().getFullYear()),
            )}
          </p>
          <div className="flex items-center">
            {locales.map((l, i) => (
              <button
                type="button"
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "px-1.5 py-1 text-[12px] font-medium transition-colors",
                  l === locale
                    ? "text-white/70"
                    : "text-white/30 hover:text-white/50",
                  i > 0 && "border-l border-white/16",
                )}
              >
                {localeLabels[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Giant logo */}
        <div className="relative overflow-hidden pb-4">
          <div className="flex items-end gap-6 sm:gap-8">
            <DidianIcon
              className="size-[clamp(4rem,12vw,10rem)] shrink-0 text-white"
              noSpin
            />
            <span className="font-[family-name:var(--font-serif)] text-[clamp(6rem,22vw,16rem)] font-normal leading-[0.82] tracking-[-0.04em] text-white lowercase">
              didian
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
