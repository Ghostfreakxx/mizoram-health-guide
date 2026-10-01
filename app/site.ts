import { healthTools } from "./tools";
import { healthTopics } from "./topics";

export const helplines = [
  { number: "108", tel: "108", label: "Ambulance", text: "Free emergency ambulance, 24 hours", urgent: true },
  { number: "112", tel: "112", label: "National Emergency", text: "Police, fire, and medical emergencies", urgent: true },
  { number: "14416", tel: "14416", label: "Tele-MANAS", text: "Free mental health support, 24 hours" },
  { number: "1800-11-2356", tel: "1800112356", label: "Tobacco Quitline", text: "Free help to quit tobacco" },
];

// Official national health portals. Links open in a new tab.
export const importantLinks = [
  { label: "Health & Family Welfare Dept., Mizoram", href: "https://health.mizoram.gov.in" },
  { label: "Ministry of Health & Family Welfare", href: "https://mohfw.gov.in" },
  { label: "National Health Mission", href: "https://nhm.gov.in" },
  { label: "eSanjeevani (free online doctor consultation)", href: "https://esanjeevani.mohfw.gov.in" },
  { label: "Tele-MANAS (mental health)", href: "https://telemanas.mohfw.gov.in" },
  { label: "ABHA – Ayushman Bharat Health Account", href: "https://abha.abdm.gov.in" },
];

// Updates to this website, shown in the "What's New" ticker.
export const whatsNew = [
  { text: "New: Diabetes Risk Check — know your risk in 1 minute", href: "/tools/diabetes-risk" },
  { text: "New: Tobacco & Kuhva Cost Calculator", href: "/tools/tobacco-cost" },
  { text: "Test yourself: Myth or Fact health quiz", href: "/tools/quiz" },
  { text: "Mental health support is free on Tele-MANAS: call 14416", href: "/helplines" },
  { text: "Find hospitals and emergency help in Mizoram", href: "/hospitals" },
];

export type SearchEntry = { title: string; href: string; description: string; keywords?: string };

export const siteIndex: SearchEntry[] = [
  ...healthTopics.map((t) => ({ title: t.title, href: t.href, description: t.text, keywords: t.keywords })),
  ...healthTools.map((t) => ({ title: t.title, href: t.href, description: t.text, keywords: t.keywords })),
  { title: "Hospital & Help Directory", href: "/hospitals", description: "Hospitals and emergency help in Mizoram.", keywords: "hospital clinic doctor emergency" },
  { title: "Helplines", href: "/helplines", description: "Free health helpline numbers: 108, 112, 14416, tobacco quitline.", keywords: "phone call number ambulance helpline mental quit" },
  { title: "Self-Check Tools", href: "/tools", description: "Quick, private health self-check tools.", keywords: "test check calculator quiz" },
  { title: "Privacy Policy", href: "/privacy", description: "How this website handles your information." },
  { title: "Accessibility Statement", href: "/accessibility", description: "Accessibility features of this website." },
  { title: "Disclaimer", href: "/disclaimer", description: "Terms for using health information on this website." },
  { title: "Sitemap", href: "/sitemap", description: "All pages on this website." },
];
