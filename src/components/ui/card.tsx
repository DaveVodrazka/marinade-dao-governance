import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</Tag>
  );
}

export function SectionHeading({
  title,
  eyebrow,
  aside,
}: {
  title: string;
  eyebrow?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {aside}
    </div>
  );
}
