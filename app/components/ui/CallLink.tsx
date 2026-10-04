import { type HelplineId, helpline } from "../../lib/helplines";

// A phone link from the single helpline registry. `children` overrides the
// visible text (the number is always in the link).
export default function CallLink({ id, className = "font-bold underline", children }: { id: HelplineId; className?: string; children?: React.ReactNode }) {
  const h = helpline(id);
  return (
    <a href={`tel:${h.tel}`} className={className} aria-label={children ? undefined : `Call ${h.name}: ${h.number}`}>
      {children ?? h.number}
    </a>
  );
}
