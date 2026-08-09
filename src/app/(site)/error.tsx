"use client";

import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error("[OW Motors public page error]", { digest: error.digest ?? "unavailable" });
  }, [error]);

  return (
    <div className="flex min-h-[55vh] items-center justify-center bg-white px-6 py-16 text-center">
      <title>Content Temporarily Unavailable | OW Motors</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-lg">
        <p className="text-eyebrow mb-3">OW Motors</p>
        <h1 className="text-display-lg">This content is temporarily unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-cool-gray">
          Please try again. If the issue continues, you can still contact the OW Motors team directly.
        </p>
        <button type="button" onClick={reset} className="ow-button-primary mt-7">
          Try Again
        </button>
      </div>
    </div>
  );
}
