// Central product naming. Change the AI Hospital's name here only.

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
