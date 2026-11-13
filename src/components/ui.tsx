import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { STATUS_LABEL, type DisplayStatus } from "@/lib/status";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ── Brand ─────────────────────────────────────────────────────────────── */

export function BrandMark({ className = "size-6" }: { className?: string }) {
  // Strata: three ground layers, the top one carrying the path accent.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="15.5" width="18" height="4.5" rx="1.2" fill="currentColor" opacity="0.9" />
      <rect x="3" y="9.75" width="12.5" height="4.25" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="3" y="4" width="7" height="4.25" rx="1.2" fill="var(--accent-fill)" />
    </svg>
  );
}

/* ── Buttons ───────────────────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover disabled:opacity-50",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2 disabled:opacity-50",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2 disabled:opacity-50",
  danger: "text-st-revision border border-line-strong hover:bg-surface-2 disabled:opacity-50",
  quiet: "bg-accent-soft text-accent-ink hover:brightness-95 disabled:opacity-50",
};
const sizes = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-10 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "secondary", size: keyof typeof sizes = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed select-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant = "secondary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/* ── Status ────────────────────────────────────────────────────────────── */

const statusDot: Record<DisplayStatus, string> = {
  not_started: "border border-line-strong bg-transparent",
  learning: "bg-st-learning",
  practiced: "bg-st-practiced",
  completed: "bg-st-completed",
  mastered: "bg-accent-fill ring-2 ring-accent ring-offset-1 ring-offset-surface",
  needs_revision: "bg-st-revision",
  blocked: "bg-st-blocked/60",
};

export function StatusDot({ status, className }: { status: DisplayStatus; className?: string }) {
  return <span aria-hidden="true" className={cx("inline-block size-2.5 shrink-0 rounded-full", statusDot[status], className)} />;
}

export function StatusPill({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2", className)}>
      <StatusDot status={status} className="size-2" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" | "muted"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    accent: "bg-accent-soft text-accent-ink",
    warn: "bg-st-revision/12 text-st-revision",
    muted: "text-ink-3 border border-line",
  };
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-[11.5px] font-medium leading-4", tones[tone], className)}>{children}</span>;
}

/* ── Progress ──────────────────────────────────────────────────────────── */

export function ProgressBar({ value, max = 100, className, label, tone = "accent" }: { value: number; max?: number; className?: string; label?: string; tone?: "accent" | "ink" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cx("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-500", tone === "accent" ? "bg-accent" : "bg-ink")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Layout ────────────────────────────────────────────────────────────── */

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children, className, id, description }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string; description?: ReactNode }) {
  return (
    <section id={id} className={cx("min-w-0", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-[15px] font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        </div>
        {action && <div className="shrink-0 text-sm">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="tnum mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[13px] text-ink-3">{hint}</div>}
    </div>
  );
}

/* ── Form controls ─────────────────────────────────────────────────────── */

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-60";

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-ink-3">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="text-[13px] font-medium text-st-revision">
          {error}
        </p>
      )}
    </div>
  );
}
