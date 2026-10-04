// The site's shared design system: one look for buttons, cards, notices and
// sections. Calm, institutional, accessible: large targets (≥ 44 px), clear
// focus, no decorative effects. Use these instead of one-off styles.

import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "primary" | "secondary" | "danger" | "quiet";

const BUTTON: Record<Tone, string> = {
  primary: "bg-blue-900 text-white hover:bg-blue-800 border-2 border-blue-900",
  secondary: "bg-white text-blue-950 border-2 border-slate-300 hover:border-blue-700 hover:bg-blue-50",
  danger: "bg-red-700 text-white hover:bg-red-800 border-2 border-red-700",
  quiet: "bg-transparent text-blue-900 underline-offset-4 hover:underline border-2 border-transparent",
};

const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-colors disabled:opacity-40";

export function ButtonLink({ href, tone = "primary", className = "", children }: { href: string; tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${BUTTON[tone]} ${className}`}>
      {children}
    </Link>
  );
}

export function Button({
  tone = "primary",
  className = "",
  children,
  ...rest
}: { tone?: Tone; className?: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${base} ${BUTTON[tone]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

// A large, tappable choice that leads somewhere (the site's main pattern).
export function ActionCard({
  href,
  icon,
  title,
  text,
  tone = "default",
}: {
  href: string;
  icon: string;
  title: string;
  text?: string;
  tone?: "default" | "primary" | "danger";
}) {
  const t =
    tone === "primary"
      ? "border-blue-900 bg-blue-900 text-white hover:bg-blue-800"
      : tone === "danger"
        ? "border-red-700 bg-red-700 text-white hover:bg-red-800"
        : "border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50";
  return (
    <Link href={href} className={`flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 transition-colors sm:p-5 ${t}`}>
      <span aria-hidden className="text-3xl sm:text-4xl">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-bold leading-snug sm:text-xl">{title}</span>
        {text && <span className={`mt-0.5 block text-sm sm:text-base ${tone === "default" ? "text-slate-600" : "text-white/85"}`}>{text}</span>}
      </span>
    </Link>
  );
}

const NOTICE = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-300 bg-red-50 text-red-950",
  success: "border-green-300 bg-green-50 text-green-950",
};

// Short contextual notices (not giant disclaimers).
export function Notice({ tone = "info", title, children, className = "" }: { tone?: keyof typeof NOTICE; title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${NOTICE[tone]} ${className}`}>
      {title && <p className="font-bold">{title}</p>}
      <div className={title ? "mt-0.5" : ""}>{children}</div>
    </div>
  );
}

export function Section({ id, title, intro, children, className = "" }: { id?: string; title: string; intro?: string; children: ReactNode; className?: string }) {
  const hid = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={hid} className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 ${className}`}>
      <h2 id={hid} className="text-2xl font-bold text-blue-950 sm:text-3xl">
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-3xl text-lg text-slate-700">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// "Not available yet" — honest empty state instead of placeholders.
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-lg font-bold text-slate-800">{title}</p>
      {children && <div className="mt-1 text-slate-600">{children}</div>}
    </div>
  );
}
