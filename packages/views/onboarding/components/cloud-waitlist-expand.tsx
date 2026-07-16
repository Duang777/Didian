"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@didian/ui/components/ui/button";
import { Input } from "@didian/ui/components/ui/input";
import { Label } from "@didian/ui/components/ui/label";
import { Textarea } from "@didian/ui/components/ui/textarea";
import { joinCloudWaitlist } from "@didian/core/onboarding";
import { cn } from "@didian/ui/lib/utils";
import { useT } from "../../i18n";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REASON_MAX = 500;

/**
 * Cloud waitlist inline form — used from both:
 *   - web Step 3 (`StepPlatformFork` cloud fork)
 *   - desktop Step 3 empty state (`StepRuntimeConnect`)
 *
 * Submitting calls `joinCloudWaitlist` and disables the form. Does NOT
 * advance the onboarding flow — the caller owns navigation (usually
 * "Skip for now" in the footer). That keeps the contract consistent:
 * waitlist is interest capture, Skip is the actual exit.
 */
export function CloudWaitlistExpand({
  submitted,
  onSubmitted,
  variant = "default",
}: {
  submitted: boolean;
  onSubmitted: () => void;
  variant?: "default" | "dark";
}) {
  const { t } = useT("onboarding");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !submitted &&
    !submitting &&
    EMAIL_PATTERN.test(email.trim()) &&
    reason.trim().length <= REASON_MAX;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await joinCloudWaitlist(email.trim(), reason.trim());
      toast.success(t(($) => $.cloud_waitlist.success_toast));
      onSubmitted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t(($) => $.cloud_waitlist.failed_toast),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-muted/40 p-5",
        variant === "dark" && "border-white/12 bg-[#050706]/72 text-white",
      )}
    >
      <p
        className={cn(
          "text-[13.5px] leading-[1.55] text-foreground/85",
          variant === "dark" && "text-white/76",
        )}
      >
        {t(($) => $.cloud_waitlist.intro_main)}{" "}
        <span className={cn("text-foreground/70", variant === "dark" && "text-white/52")}>
          {t(($) => $.cloud_waitlist.intro_warning)}
        </span>
      </p>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="waitlist-email"
          className={cn(
            "text-xs font-medium text-muted-foreground",
            variant === "dark" && "text-white/58",
          )}
        >
          {t(($) => $.cloud_waitlist.email_label)}
        </Label>
        <Input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={submitted}
          placeholder={t(($) => $.cloud_waitlist.email_placeholder)}
          className={cn(
            variant === "dark" &&
              "border-white/14 bg-[#050706]/72 text-white placeholder:text-white/35 focus-visible:ring-[#f2b15f]/24",
          )}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="waitlist-reason"
          className={cn(
            "text-xs font-medium text-muted-foreground",
            variant === "dark" && "text-white/58",
          )}
        >
          {t(($) => $.cloud_waitlist.reason_label)}
          <span
            className={cn(
              "ml-2 font-normal text-muted-foreground/70",
              variant === "dark" && "text-white/42",
            )}
          >
            {t(($) => $.cloud_waitlist.optional)}
          </span>
        </Label>
        <Textarea
          id="waitlist-reason"
          value={reason}
          disabled={submitted}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t(($) => $.cloud_waitlist.reason_placeholder)}
          className={cn(
            variant === "dark" &&
              "border-white/14 bg-[#050706]/72 text-white placeholder:text-white/35 focus-visible:ring-[#f2b15f]/24",
          )}
          rows={3}
          maxLength={REASON_MAX}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          size="lg"
          disabled={submitted || !canSubmit}
          onClick={submit}
          className={cn(
            variant === "dark" &&
              "bg-white text-[#0a0d12] hover:bg-white/90 disabled:bg-white/60",
          )}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitted ? (
            <>
              <Check className="h-4 w-4" />
              {t(($) => $.cloud_waitlist.on_list)}
            </>
          ) : (
            <>
              {t(($) => $.cloud_waitlist.join)}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
