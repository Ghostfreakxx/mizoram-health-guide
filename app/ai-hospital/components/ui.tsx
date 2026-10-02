import ReadAloud from "../../components/ReadAloud";

// Large, simple controls for AI Hospital (elderly-friendly, big touch targets).

export function BigChoice({
  selected = false,
  onClick,
  children,
  tone = "default",
  className = "",
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  const base =
    tone === "danger"
      ? "border-red-300 bg-white text-red-900 hover:border-red-500 hover:bg-red-50"
      : selected
        ? "border-blue-700 bg-blue-50 text-blue-950"
        : "border-slate-300 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50";
  return (
    <button
      type="button"
      aria-pressed={tone === "danger" ? undefined : selected}
      onClick={onClick}
      className={`min-h-14 w-full rounded-xl border-2 px-5 py-4 text-left text-lg font-semibold transition ${base} ${className}`}
    >
      {children}
    </button>
  );
}

export function StepTitle({ children, hint, speak }: { children: React.ReactNode; hint?: React.ReactNode; speak?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold leading-snug text-blue-950 sm:text-3xl">{children}</h2>
      {hint && <p className="mt-2 text-lg text-slate-600">{hint}</p>}
      {speak && <ReadAloud text={speak} className="mt-3" />}
    </div>
  );
}

export function BoundaryNote({ text }: { text: string }) {
  return (
    <p className="flex gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
      <span aria-hidden>ℹ️</span>
      <span>{text}</span>
    </p>
  );
}
