"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  useEffect(() => {
    console.error("[OW Motors global error]", { digest: error.digest ?? "unavailable" });
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>OW Motors | Error</title>
        <meta name="robots" content="noindex, nofollow" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #fff; color: #111; font-family: Arial, sans-serif; }
          main { display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 4rem 1.5rem; text-align: center; }
          section { max-width: 36rem; }
          p { color: #6b7280; line-height: 1.6; }
          button { min-height: 44px; margin-top: 1.5rem; border: 2px solid #c62828; background: #c62828; color: #fff; padding: .625rem 1.25rem; font: inherit; font-weight: 600; cursor: pointer; }
          button:hover { background: #fff; color: #c62828; }
          button:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
        `}</style>
      </head>
      <body>
        <main>
          <section aria-labelledby="global-error-title">
            <h1 id="global-error-title">OW Motors is temporarily unavailable</h1>
            <p>Please try again. No information you entered has been submitted again.</p>
            <button type="button" onClick={unstable_retry}>Try Again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
