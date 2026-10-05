import type { ReactNode } from "react";

const TONES = {
  neutral: "border-line bg-surface-2 text-muted",
  warning: "border-warn/30 bg-warn-soft text-fg",
  error: "border-against/30 bg-against-soft text-fg",
} as const;

export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}>
      <p className="font-medium text-fg">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}
