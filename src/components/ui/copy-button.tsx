"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable (e.g. insecure context); ignore.
        }
      }}
      className="inline-flex h-6 items-center rounded-md border border-line px-1.5 text-[11px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
      aria-label={`${label} ${value}`}
      title={label}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
