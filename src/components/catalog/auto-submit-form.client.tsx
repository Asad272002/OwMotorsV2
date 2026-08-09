"use client";

import type { FormEvent, ReactNode } from "react";

type Props = Readonly<{
  action: string;
  children: ReactNode;
  className?: string;
  fallbackLabel: string;
  fallbackClassName?: string;
}>;

export function AutoSubmitForm({ action, children, className, fallbackLabel, fallbackClassName }: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => event.currentTarget.requestSubmit();

  return <form
    action={action}
    method="get"
    className={className}
    onChange={(event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number") return;
      submit(event);
    }}
    onBlur={(event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number") submit(event);
    }}
  >
    {children}
    <noscript><button type="submit" className={fallbackClassName}>{fallbackLabel}</button></noscript>
  </form>;
}
