"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactInquiry } from "@/app/actions/public-submissions";
import { INITIAL_SUBMISSION_STATE } from "@/lib/forms/submission-state";

function FieldError({ id, errors }: Readonly<{ id: string; errors?: readonly string[] }>) {
  return errors?.length ? <p id={id} className="mt-1 text-xs text-brand">{errors[0]}</p> : null;
}

const inputClass = "mt-2 min-h-12 w-full border border-border bg-white px-4 text-base outline-none transition-colors focus:border-brand sm:text-sm";

export function ContactInquiryForm() {
  const [state, action, pending] = useActionState(submitContactInquiry, INITIAL_SUBMISSION_STATE);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error") statusRef.current?.focus();
  }, [state]);

  return <form action={action} className="border border-border bg-white p-6 sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Full name<input name="fullName" autoComplete="name" required minLength={2} maxLength={120} className={inputClass} aria-invalid={Boolean(state.errors?.fullName)} aria-describedby={state.errors?.fullName ? "contact-full-name-error" : undefined} /><FieldError id="contact-full-name-error" errors={state.errors?.fullName} /></label>
      <label className="text-sm font-semibold">Phone <span className="font-normal text-cool-gray">(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={25} className={inputClass} aria-invalid={Boolean(state.errors?.phone)} aria-describedby={state.errors?.phone ? "contact-phone-error" : undefined} /><FieldError id="contact-phone-error" errors={state.errors?.phone} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} aria-invalid={Boolean(state.errors?.email)} aria-describedby={state.errors?.email ? "contact-email-error" : undefined} /><FieldError id="contact-email-error" errors={state.errors?.email} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Subject<input name="subject" required minLength={2} maxLength={180} className={inputClass} aria-invalid={Boolean(state.errors?.subject)} aria-describedby={state.errors?.subject ? "contact-subject-error" : undefined} /><FieldError id="contact-subject-error" errors={state.errors?.subject} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Message<textarea name="message" required minLength={10} maxLength={4000} rows={7} className={`${inputClass} py-3`} aria-invalid={Boolean(state.errors?.message)} aria-describedby={state.errors?.message ? "contact-message-error" : undefined} /><FieldError id="contact-message-error" errors={state.errors?.message} /></label>
    </div>
    <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {state.message ? <p ref={statusRef} tabIndex={state.status === "error" ? -1 : undefined} className={`mt-5 text-sm ${state.status === "success" ? "text-emerald-700" : "text-brand"}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p> : null}
    <button type="submit" disabled={pending} className="ow-button-primary mt-6 min-w-44 disabled:cursor-wait disabled:opacity-60">{pending ? "Sending…" : "Send Inquiry"}</button>
  </form>;
}
