// Central product naming. Change names here only.

// The whole website's identity.
export const SITE = {
  name: "Mizoram AI Hospital",
  tagline: "Digital Front Door to Healthcare",
  status: "Prototype",
  boundary: "Health navigation and information — not a medical diagnosis.",
} as const;

// The five areas of the site (navigation everywhere uses this list).
export const AREAS = [
  { href: "/ai-hospital", label: "AI Hospital", short: "Hospital", icon: "🏥" },
  { href: "/health-library", label: "Health Library", short: "Library", icon: "📚" },
  { href: "/find-care", label: "Find Care", short: "Find care", icon: "📍" },
  { href: "/my-visit", label: "My Visit", short: "My visit", icon: "📋" },
  { href: "/about", label: "About", short: "About", icon: "ℹ️" },
] as const;

export const AI_HOSPITAL = {
  name: "AI Hospital",
  subtitle: "Digital Front Door to Healthcare",
  basePath: "/ai-hospital",
  definition:
    "AI Hospital is an automated digital health-navigation and patient-preparation platform. It helps you understand how urgently to seek care, find the right service, and prepare for your visit to a real doctor or hospital.",
  boundary:
    "AI Hospital does not diagnose, prescribe, or replace a doctor or hospital. Diagnosis and treatment are only provided by qualified healthcare professionals.",
  shortBoundary: "Guidance on where to go and how to prepare — not a diagnosis.",
  // Clinical routing is deterministic and rule-based. No generative model
  // decides urgency, diagnosis, or treatment.
  engine: "rules",
} as const;
