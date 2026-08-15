"use client";

import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { AdminActionState } from "@/lib/admin/action-state";
import { INITIAL_ADMIN_ACTION_STATE } from "@/lib/admin/action-state";
import { SaveStatus } from "@/components/admin/admin-ui";

function safeFieldCandidates(path: string): string[] {
  if (!path) return [];
  const clean = path.replace(/^\[/, "").replace(/\]$/, "");
  const parts = clean.split(/[.\][\s]+/).filter(Boolean);
  const exact = parts.join(".");
  const snake = parts.map((s, idx) => (idx === 0 ? s : s.replace(/^[a-z]/, (c) => c.toUpperCase()))).join("");
  const under = parts.join("_");
  const camel = parts
    .map((s, idx) => {
      if (idx === 0) return s;
      return s.replace(/^[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
  const candidates = [exact, snake, under, camel];
  for (let depth = parts.length; depth >= 1; depth -= 1) {
    candidates.push(parts.slice(-depth).join("_"));
    candidates.push(parts.slice(-depth).map((s, i) => (i === 0 ? s : s.replace(/^[a-z]/, (c) => c.toUpperCase()))).join(""));
  }
  return Array.from(new Set(candidates)).filter(Boolean);
}

type Action = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

function ConfirmationDialog({
  open,
  message,
  destructive,
  onCancel,
  onConfirm,
}: Readonly<{
  open: boolean;
  message: string;
  destructive: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) window.setTimeout(() => confirmRef.current?.focus(), 0);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description" className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-2xl" onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${destructive ? "bg-red-50 text-[#C62828]" : "bg-amber-50 text-[#D97706]"}`}><TriangleAlert aria-hidden="true" className="h-5 w-5" /></span>
        <h2 id="admin-confirm-title" className="mt-4 font-display text-2xl font-bold text-[#111111]">Confirm this action</h2>
        <p id="admin-confirm-description" className="mt-2 text-sm leading-6 text-[#6B7280]">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] transition-colors hover:border-[#9CA3AF] hover:bg-[#F7F7F8]">Cancel</button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold text-white transition-colors ${destructive ? "border-[#C62828] bg-[#C62828] hover:bg-[#A91F1F]" : "border-[#111111] bg-[#111111] hover:border-[#C62828] hover:bg-[#C62828]"}`}>Confirm</button>
        </div>
      </section>
    </div>
  );
}

function ActionToast({ state }: Readonly<{ state: AdminActionState }>) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  if (!state.message || dismissedMessage === state.message) return null;
  const success = state.status === "success";
  const Icon = success ? CheckCircle2 : TriangleAlert;
  return (
    <div role={success ? "status" : "alert"} aria-live={success ? "polite" : "assertive"} className={`fixed bottom-4 right-4 z-[85] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border bg-white p-4 shadow-xl ${success ? "border-green-200" : "border-red-200"}`}>
      <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${success ? "text-[#15803D]" : "text-[#C62828]"}`} />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#111111]">{success ? "Saved" : "Action needed"}</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">{state.message}</p></div>
      <button type="button" onClick={() => setDismissedMessage(state.message)} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#111111]" aria-label="Dismiss notification"><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>
  );
}

export function AdminForm({
  action,
  children,
  submitLabel = "Save changes",
  pendingLabel = "Saving…",
  confirmMessage,
  destructive = false,
  showStatus,
  className = "space-y-5",
  hideAutoSubmit = false,
  formAttributes,
}: Readonly<{
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  confirmMessage?: string;
  destructive?: boolean;
  showStatus?: boolean;
  className?: string;
  hideAutoSubmit?: boolean;
  formAttributes?: React.FormHTMLAttributes<HTMLFormElement>;
}>) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ADMIN_ACTION_STATE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorsEmittedRef = useRef<AdminActionState | null>(null);
  const displayStatus = showStatus ?? (!destructive && className !== "contents");

  useEffect(() => {
    if (!state.errors || Object.keys(state.errors).length === 0) {
      errorsEmittedRef.current = null;
      return;
    }
    if (errorsEmittedRef.current && Object.is(errorsEmittedRef.current.errors, state.errors) && errorsEmittedRef.current.message === state.message) {
      return;
    }
    errorsEmittedRef.current = state;
    const errorsBag = state.errors;
    window.dispatchEvent(new CustomEvent("admin-form:errors", { detail: { errors: errorsBag, action: action.name || String(action) } }));
    const form = formRef.current;
    if (!form) return;
    const paths = Object.keys(errorsBag);
    let firstFound: HTMLElement | null = null;
    for (const p of paths) {
      const candidates = safeFieldCandidates(p);
      const allCandidates: HTMLElement[] = [];
      for (const nm of candidates) {
        const escaped = CSS.escape ? CSS.escape(nm) : nm;
        const named = form.querySelectorAll<HTMLElement>(`[name="${escaped}"], [data-error-path="${escaped}"], [aria-describedby*="${escaped}"]`);
        named.forEach((el) => allCandidates.push(el as HTMLElement));
      }
      for (const pNested of candidates) {
        const prefixed = `payments.${pNested}`;
        const escaped = CSS.escape ? CSS.escape(prefixed) : prefixed;
        const nested = form.querySelectorAll<HTMLElement>(`[data-error-path*="${escaped}"]`);
        nested.forEach((el) => allCandidates.push(el as HTMLElement));
      }
      if (allCandidates.length > 0 && !firstFound) {
        firstFound = allCandidates[0];
      }
    }
    if (!firstFound) {
      const summaryBox = form.querySelector<HTMLElement>('div[role="alert"].border-red-200.bg-red-50');
      if (summaryBox) firstFound = summaryBox;
    }
    if (firstFound) {
      firstFound.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTimeout(() => {
        if (firstFound && typeof (firstFound as HTMLInputElement).focus === "function") {
          try {
            (firstFound as HTMLInputElement).focus({ preventScroll: true });
          } catch (_err) { /* noop */ }
        }
      }, 450);
    }
  }, [state.errors, state.message, action]);

  function confirmSubmission() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        {...formAttributes}
        onSubmit={(event) => {
          if (formAttributes?.onSubmit) {
            formAttributes.onSubmit(event as React.FormEvent<HTMLFormElement>);
            if (event.defaultPrevented) return;
          }
          if (!confirmMessage) return;
          if (confirmedRef.current) {
            confirmedRef.current = false;
            return;
          }
          event.preventDefault();
          setConfirmOpen(true);
        }}
      >
        {children}
        {state.errors ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-[#C62828]">Review the highlighted information</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#991B1B]">{Object.entries(state.errors).flatMap(([field, messages], _outer) => (messages ?? []).map((message, inner) => <li key={`${field}-${inner}-${String(message ?? "msg").slice(0, 40)}`}>{message}</li>))}</ul>
          </div>
        ) : null}
        {state.message ? <p role="status" aria-live="polite" className={`rounded-md border px-4 py-3 text-sm ${state.status === "success" ? "border-green-200 bg-green-50 text-[#15803D]" : "border-red-200 bg-red-50 text-[#C62828]"}`}>{state.message}</p> : null}
        {!hideAutoSubmit ? (
          <div className={`flex flex-wrap items-center gap-4 ${className === "contents" ? "w-full" : ""}`}>
            <button type="submit" disabled={pending} className={`inline-flex min-h-11 items-center justify-center rounded-md border px-5 text-sm font-semibold transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 ${destructive ? "border-[#C62828] bg-white text-[#C62828] hover:bg-[#C62828] hover:text-white" : "border-[#C62828] bg-[#C62828] text-white hover:border-[#A91F1F] hover:bg-[#A91F1F]"}`}>{pending ? pendingLabel : submitLabel}</button>
            {displayStatus ? <SaveStatus status={pending ? "saving" : state.status === "success" ? "saved" : state.status === "error" ? "error" : "idle"} /> : null}
          </div>
        ) : null}
      </form>
      {confirmMessage ? <ConfirmationDialog open={confirmOpen} message={confirmMessage} destructive={destructive} onCancel={() => setConfirmOpen(false)} onConfirm={confirmSubmission} /> : null}
      <ActionToast state={state} />
    </>
  );
}
