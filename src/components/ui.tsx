import { ReactNode } from "react";
import clsx from "clsx";

/** Wrap any wide table in this so it scrolls horizontally on narrow
 *  viewports instead of breaking the page layout. */
export function ScrollTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("overflow-x-auto", className)}>{children}</div>;
}

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl shadow-[var(--shadow-card)]",
        hover && "card-hover",
        className
      )}
    >
      {children}
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
  error: "text-[var(--color-error)] bg-[var(--color-error-bg)]",
  info: "text-[var(--color-info)] bg-[color-mix(in_srgb,var(--color-info)_12%,white)]",
  neutral: "text-[var(--color-muted)] bg-[var(--color-sand-100)]",
  teal: "text-[var(--color-teal-dark)] bg-[color-mix(in_srgb,var(--color-teal)_15%,white)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_STYLES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        BADGE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "outline";
}) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--color-navy)] text-white hover:brightness-110",
    accent: "bg-[var(--color-teal)] text-[var(--color-navy)] hover:brightness-105",
    ghost: "bg-transparent text-[var(--color-navy)] hover:bg-[var(--color-sand-100)]",
    outline:
      "bg-white text-[var(--color-navy)] border border-[var(--color-sand-400)] hover:bg-[var(--color-sand-100)]",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warning" | "error";
}) {
  const toneColor =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
      ? "text-[var(--color-warning)]"
      : tone === "error"
      ? "text-[var(--color-error)]"
      : "text-[var(--color-navy)]";
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-2)]">
        {label}
      </div>
      <div className={clsx("font-[family-name:var(--font-serif)] text-2xl font-bold mt-1", toneColor)}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-1">{sub}</div>}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-[family-name:var(--font-serif)] text-2xl font-bold text-[var(--color-navy)]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-[var(--color-muted)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="text-center py-16 text-sm text-[var(--color-muted)] border border-dashed border-[var(--color-sand-400)] rounded-2xl">
      {children}
    </div>
  );
}
