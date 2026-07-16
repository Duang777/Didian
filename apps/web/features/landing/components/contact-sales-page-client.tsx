"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LandingHeader } from "./landing-header";
import { LandingFooter } from "./landing-footer";
import { LandingSectionShell } from "./shared";
import { useLocale } from "../i18n";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

type FormState = {
  firstName: string;
  lastName: string;
  businessEmail: string;
  companyName: string;
  companySize: string;
  countryRegion: string;
  useCase: string;
  goals: string;
  consentOutreach: boolean;
  consentUpdates: boolean;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  businessEmail: "",
  companyName: "",
  companySize: "",
  countryRegion: "",
  useCase: "",
  goals: "",
  consentOutreach: false,
  consentUpdates: false,
};

// Free providers we reject client-side, so users get instant feedback. The
// server enforces a longer list independently — this is purely a UX guard
// and is not a security boundary.
const CLIENT_FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "qq.com",
  "163.com",
  "126.com",
  "foxmail.com",
]);

export function ContactSalesPageClient() {
  const { t } = useLocale();
  const c = t.contactSales;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const successAnchorRef = useRef<HTMLDivElement | null>(null);

  const isBusy = state.status === "submitting";

  // After a successful submit, the tall form collapses into the much shorter
  // success card. The browser keeps the scroll offset, which lands the user
  // on the footer — they have to scroll up to see the confirmation. Pull the
  // page back so the thank-you message is in view.
  useEffect(() => {
    if (state.status !== "success") return;
    successAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [state.status]);

  const emailDomain = useMemo(() => {
    const at = form.businessEmail.lastIndexOf("@");
    if (at < 0) return "";
    return form.businessEmail.slice(at + 1).trim().toLowerCase();
  }, [form.businessEmail]);

  const emailLooksFree = emailDomain !== "" && CLIENT_FREE_EMAIL_DOMAINS.has(emailDomain);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isBusy) return;
    if (emailLooksFree) {
      setState({ status: "error", message: c.errors.freeEmail });
      return;
    }
    setState({ status: "submitting" });

    try {
      // Call the API origin directly (same as the rest of the web app via
      // `apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}`). The `/api/*` Vercel
      // rewrite uses server-only `REMOTE_API_URL`, which on Vercel may not
      // be publicly resolvable — relying on it makes this endpoint 404 even
      // when every other API works.
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/contact-sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          business_email: form.businessEmail,
          company_name: form.companyName,
          company_size: form.companySize,
          country_region: form.countryRegion,
          use_case: form.useCase,
          goals: form.goals,
          consent_outreach: form.consentOutreach,
          consent_updates: form.consentUpdates,
        }),
      });

      if (res.ok) {
        setState({ status: "success" });
        setForm(EMPTY_FORM);
        return;
      }

      // 429 from per-IP middleware or per-email DB cap.
      if (res.status === 429) {
        setState({ status: "error", message: c.errors.rateLimit });
        return;
      }

      // Try to extract a server error message; fall back to generic copy.
      let serverMsg = "";
      try {
        const body = (await res.json()) as { error?: unknown };
        if (typeof body?.error === "string") serverMsg = body.error;
      } catch {
        // ignore — body wasn't JSON.
      }
      if (/business email/i.test(serverMsg)) {
        setState({ status: "error", message: c.errors.freeEmail });
      } else if (/email/i.test(serverMsg)) {
        setState({ status: "error", message: c.errors.invalidEmail });
      } else {
        setState({ status: "error", message: c.errors.generic });
      }
    } catch {
      setState({ status: "error", message: c.errors.generic });
    }
  }

  return (
    <>
      <div className="relative">
        <LandingHeader variant="dark" />
        <LandingSectionShell>
      <main>
        <div
          ref={successAnchorRef}
          className="mx-auto max-w-[760px] px-4 py-28 sm:px-6 sm:py-32 lg:py-36"
        >
          <div className="mb-8 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#f2b15f]/70">
              {c.eyebrow}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-serif)] text-[2.4rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.8rem]">
              {c.title}
            </h1>
            <p className="mt-3 text-[14px] text-white/58 sm:text-[15px]">
              {c.subtitle}
            </p>
          </div>

          {state.status === "success" ? (
            <SuccessCard
              title={c.success.title}
              message={c.success.message}
              cta={c.success.cta}
            />
          ) : (
            <FormCard
              form={form}
              update={update}
              emailLooksFree={emailLooksFree}
              busy={isBusy}
              error={state.status === "error" ? state.message : null}
              onSubmit={handleSubmit}
              dict={c}
            />
          )}
        </div>
      </main>
        </LandingSectionShell>
      </div>
      <LandingFooter />
    </>
  );
}

function SuccessCard({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/12 bg-white/[0.045] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-10">
      <h2 className="font-[family-name:var(--font-serif)] text-[1.8rem] leading-[1.15] tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-[1.7] text-white/62">
        {message}
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[11px] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a0d12] transition-colors hover:bg-white/90"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

type FormDict = ReturnType<typeof useLocale>["t"]["contactSales"];

function FormCard({
  form,
  update,
  emailLooksFree,
  busy,
  error,
  onSubmit,
  dict,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  emailLooksFree: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  dict: FormDict;
}) {
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const emailHintId = useId();
  const companyId = useId();
  const sizeId = useId();
  const countryId = useId();
  const useCaseId = useId();
  const goalsId = useId();
  const goalsHintId = useId();
  const consentOutreachId = useId();
  const consentUpdatesId = useId();

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-[8px] border border-white/12 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-10"
    >
      <div className="rounded-[8px] border border-[#f2b15f]/18 bg-[#f2b15f]/8 p-4 text-[13px] leading-[1.6] text-white/66">
        <p className="font-semibold text-white">
          <span aria-hidden className="mr-1.5 text-[#f2b15f]">*</span>
          {dict.notice.badge}
        </p>
        <p className="mt-1">{dict.notice.body}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.fields.firstName} htmlFor={firstNameId} required>
          <TextInput
            id={firstNameId}
            value={form.firstName}
            onChange={(v) => update("firstName", v)}
            autoComplete="given-name"
            maxLength={80}
            required
            disabled={busy}
          />
        </Field>
        <Field label={dict.fields.lastName} htmlFor={lastNameId} required>
          <TextInput
            id={lastNameId}
            value={form.lastName}
            onChange={(v) => update("lastName", v)}
            autoComplete="family-name"
            maxLength={80}
            required
            disabled={busy}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={dict.fields.businessEmail}
          htmlFor={emailId}
          required
          hint={dict.fields.businessEmailHint}
          hintId={emailHintId}
          tone={emailLooksFree ? "warning" : undefined}
        >
          <TextInput
            id={emailId}
            type="email"
            value={form.businessEmail}
            onChange={(v) => update("businessEmail", v)}
            autoComplete="email"
            maxLength={254}
            required
            disabled={busy}
            ariaDescribedBy={emailHintId}
            ariaInvalid={emailLooksFree || undefined}
          />
        </Field>
        <Field label={dict.fields.companyName} htmlFor={companyId} required>
          <TextInput
            id={companyId}
            value={form.companyName}
            onChange={(v) => update("companyName", v)}
            autoComplete="organization"
            maxLength={200}
            required
            disabled={busy}
          />
        </Field>
      </div>

      <Field label={dict.fields.companySize} htmlFor={sizeId} required>
        <SelectInput
          id={sizeId}
          value={form.companySize}
          onChange={(v) => update("companySize", v)}
          placeholder={dict.fields.selectPlaceholder}
          required
          disabled={busy}
          options={dict.companySizes}
        />
      </Field>

      <Field label={dict.fields.countryRegion} htmlFor={countryId} required>
        <SelectInput
          id={countryId}
          value={form.countryRegion}
          onChange={(v) => update("countryRegion", v)}
          placeholder={dict.fields.selectPlaceholder}
          required
          disabled={busy}
          options={dict.countries.map((c) => ({ value: c, label: c }))}
        />
      </Field>

      <Field label={dict.fields.useCase} htmlFor={useCaseId} required>
        <SelectInput
          id={useCaseId}
          value={form.useCase}
          onChange={(v) => update("useCase", v)}
          placeholder={dict.fields.selectPlaceholder}
          required
          disabled={busy}
          options={dict.useCases}
        />
      </Field>

      <Field
        label={dict.fields.goals}
        htmlFor={goalsId}
        hint={dict.fields.goalsHint}
        hintId={goalsHintId}
      >
        <textarea
          id={goalsId}
          value={form.goals}
          onChange={(e) => update("goals", e.target.value)}
          rows={4}
          maxLength={2000}
          disabled={busy}
          aria-describedby={goalsHintId}
          className="block w-full rounded-[10px] border border-white/14 bg-[#050706]/72 px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/35 transition-colors focus:border-[#f2b15f]/60 focus:outline-none focus:ring-2 focus:ring-[#f2b15f]/15 disabled:opacity-60"
        />
      </Field>

      <ConsentBlock
        outreachId={consentOutreachId}
        updatesId={consentUpdatesId}
        form={form}
        update={update}
        dict={dict}
        busy={busy}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-[10px] border border-[#f06a52]/28 bg-[#f06a52]/10 px-4 py-3 text-[13px] leading-[1.6] text-[#ffd3cb]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-[12px] bg-white px-5 py-3 text-[14px] font-semibold text-[#0a0d12] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {busy ? dict.fields.submitting : dict.fields.submit}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  hintId,
  tone,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  hintId?: string;
  tone?: "warning";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-white/78"
      >
        {label}
        {required ? <span className="ml-0.5 text-[#f2b15f]">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p
          id={hintId}
          className={
            tone === "warning"
              ? "text-[12px] leading-[1.55] text-[#ffd3cb]"
              : "text-[12px] leading-[1.55] text-white/46"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
  required,
  disabled,
  ariaDescribedBy,
  ariaInvalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      maxLength={maxLength}
      required={required}
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      className="block w-full rounded-[10px] border border-white/14 bg-[#050706]/72 px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/35 transition-colors focus:border-[#f2b15f]/60 focus:outline-none focus:ring-2 focus:ring-[#f2b15f]/15 disabled:opacity-60 aria-[invalid=true]:border-[#f06a52]/60 aria-[invalid=true]:focus:ring-[#f06a52]/15"
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="block w-full appearance-none rounded-[10px] border border-white/14 bg-[#050706]/72 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M1%201.5L6%206.5L11%201.5%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.6%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_8px] bg-[right_14px_center] bg-no-repeat px-3.5 py-2.5 pr-10 text-[14px] text-white transition-colors focus:border-[#f2b15f]/60 focus:outline-none focus:ring-2 focus:ring-[#f2b15f]/15 disabled:opacity-60"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ConsentBlock({
  outreachId,
  updatesId,
  form,
  update,
  dict,
  busy,
}: {
  outreachId: string;
  updatesId: string;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  dict: FormDict;
  busy: boolean;
}) {
  return (
    <div className="space-y-3 text-[13px] leading-[1.65] text-white/60">
      <p className="font-semibold text-white">
        {dict.consent.intro}
      </p>
      <ConsentCheckbox
        id={outreachId}
        checked={form.consentOutreach}
        onChange={(v) => update("consentOutreach", v)}
        disabled={busy}
        label={dict.consent.outreach}
      />
      <ConsentCheckbox
        id={updatesId}
        checked={form.consentUpdates}
        onChange={(v) => update("consentUpdates", v)}
        disabled={busy}
        label={dict.consent.updates}
      />
      <p>
        {dict.consent.unsubscribe}{" "}
        <Link
          href={dict.consent.privacyLinkHref}
          className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
        >
          {dict.consent.privacyLinkLabel}
        </Link>
      </p>
      <p>{dict.consent.submitConsent}</p>
    </div>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  disabled,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 rounded-[4px] border-white/30 bg-[#050706]/72 text-[#f2b15f] focus:ring-[#f2b15f]/20 disabled:opacity-60"
      />
      <span>{label}</span>
    </label>
  );
}
