import Link from "next/link";
import { useLocale } from "../../i18n";
import type { DownloadAssets } from "../../utils/parse-release-assets";
import { LandingSectionShell } from "../shared";
import { AppleIcon, LinuxIcon, WindowsIcon } from "./os-icons";

interface Props {
  assets: DownloadAssets;
  /** Link to GitHub releases page, used when individual asset URLs
   *  couldn't be resolved (API down / parse failure). */
  fallbackHref: string;
}

/**
 * Full matrix of platform + arch + format links. Always visible
 * regardless of which platform the Hero resolved to — lets power
 * users grab any build directly.
 */
export function AllPlatforms({
  assets,
  fallbackHref,
}: Props) {
  const { t } = useLocale();
  const d = t.download.allPlatforms;

  return (
    <LandingSectionShell id="all-platforms" grid={false}>
      <div className="mx-auto max-w-[920px] px-4 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-serif)] text-[2.2rem] leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
          {d.title}
        </h2>

        <div className="mt-10 overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <Row
            icon={<AppleIcon className="text-white" />}
            label={d.macLabel}
            formats={[
              {
                label: d.formatDmg,
                href: assets.macArm64Dmg,
              },
              {
                label: d.formatZip,
                href: assets.macArm64Zip,
              },
            ]}
            unavailable={d.unavailable}
          />
          <Row
            icon={<WindowsIcon className="text-white" />}
            label={d.winX64Label}
            formats={[
              {
                label: d.formatExe,
                href: assets.winX64Exe,
              },
            ]}
            unavailable={d.unavailable}
          />
          <Row
            icon={<WindowsIcon className="text-white" />}
            label={d.winArm64Label}
            formats={[
              {
                label: d.formatExe,
                href: assets.winArm64Exe,
              },
            ]}
            unavailable={d.unavailable}
          />
          <Row
            icon={<LinuxIcon className="text-white" />}
            label={d.linuxX64Label}
            formats={[
              {
                label: d.formatAppImage,
                href: assets.linuxAmd64AppImage,
              },
              {
                label: d.formatDeb,
                href: assets.linuxAmd64Deb,
              },
              {
                label: d.formatRpm,
                href: assets.linuxAmd64Rpm,
              },
            ]}
            unavailable={d.unavailable}
          />
          <Row
            icon={<LinuxIcon className="text-white" />}
            label={d.linuxArm64Label}
            formats={[
              {
                label: d.formatAppImage,
                href: assets.linuxArm64AppImage,
              },
              {
                label: d.formatDeb,
                href: assets.linuxArm64Deb,
              },
              {
                label: d.formatRpm,
                href: assets.linuxArm64Rpm,
              },
            ]}
            unavailable={d.unavailable}
            isLast
          />
        </div>

        <p className="mt-6 text-[13px] text-white/48">{d.intelNote}</p>

        {isFallbackNeeded(assets) ? (
          <p className="mt-2 text-[13px] text-white/48">
            <Link
              href={fallbackHref}
              className="underline decoration-white/30 underline-offset-4 hover:text-white hover:decoration-white/70"
              target="_blank"
              rel="noreferrer"
            >
              {t.download.footer.allReleases}
            </Link>
          </p>
        ) : null}
      </div>
    </LandingSectionShell>
  );
}

// ------------------------------------------------------------
// Row
// ------------------------------------------------------------

interface RowProps {
  icon: React.ReactNode;
  label: string;
  formats: {
    label: string;
    href: string | undefined;
  }[];
  unavailable: string;
  isLast?: boolean;
}

function Row({ icon, label, formats, unavailable, isLast }: RowProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5 text-white ${isLast ? "" : "border-b border-white/10"}`}
    >
      <div className="flex min-w-[220px] items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055]">
          {icon}
        </span>
        <span className="text-[14.5px] font-medium">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {formats.map((f) =>
          f.href ? (
            <a
              key={f.label}
              href={f.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:border-white/28 hover:bg-white/10"
            >
              {f.label}
            </a>
          ) : (
            <span
              key={f.label}
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-1.5 text-[13px] text-white/34"
              title={unavailable}
            >
              {f.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

// Ten desktop artifacts are expected per release (two Mac,
// two Windows, six Linux). If any are missing, surface the GitHub
// fallback link so users on an orphaned row have a way out.
const EXPECTED_ASSET_COUNT = 10;

function isFallbackNeeded(assets: DownloadAssets): boolean {
  return Object.values(assets).filter(Boolean).length < EXPECTED_ASSET_COUNT;
}
