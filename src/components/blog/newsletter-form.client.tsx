"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions/blog";
import { INITIAL_SUBMISSION_STATE } from "@/lib/forms/submission-state";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, INITIAL_SUBMISSION_STATE);
  return <form action={action} className="w-full max-w-md" aria-label="Subscribe to OW Motors news">
    <div className="flex min-w-0 rounded-md border border-white/10 bg-white/[0.07] focus-within:border-brand">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input id="newsletter-email" name="email" type="email" required autoComplete="email" maxLength={254} placeholder="Your email address" className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none focus-visible:!outline-none placeholder:text-white/45" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button type="submit" disabled={pending} className="min-h-12 shrink-0 rounded-r-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60">{pending ? "Joining…" : "Subscribe"}</button>
    </div>
    {state.message ? <p role="status" aria-live="polite" className={`mt-2 text-xs ${state.status === "error" ? "text-red-300" : "text-green-300"}`}>{state.message}</p> : null}
  </form>;
}

