export type TopicContent = {
  slug: string;
  icon: string;
  title: string;
  intro: string;
  readingTime: string;
  facts: { value: string; label: string; source: string }[];
  overview: string[];
  // Optional highlighted box for Mizoram-specific information.
  local?: { title: string; text: string };
  signsTitle: string;
  signs: { icon: string; text: string }[];
  signsNote: string;
  risks: {
    changeable: { icon: string; title: string; text: string }[];
    fixed: { icon: string; title: string; text: string }[];
  };
  prevention: { title: string; text: string }[];
  help: { urgent: string[]; soon: string[]; routine: string[] };
  myths: { myth: string; fact: string }[];
  faqs: { q: string; a: string }[];
  sources: { label: string; href?: string }[];
  tool?: { href: string; title: string; text: string };
  related: string[];
};
