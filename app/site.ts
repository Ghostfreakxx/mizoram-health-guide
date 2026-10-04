import { healthTools } from "./tools";
import { healthTopics } from "./topics";

// Official national health portals. Links open in a new tab.
export const importantLinks = [
  { label: "Health & Family Welfare Dept., Mizoram", href: "https://health.mizoram.gov.in" },
  { label: "Ministry of Health & Family Welfare", href: "https://mohfw.gov.in" },
  { label: "National Health Mission", href: "https://nhm.gov.in" },
  { label: "eSanjeevani (free online doctor consultation)", href: "https://esanjeevani.mohfw.gov.in" },
  { label: "Tele-MANAS (mental health)", href: "https://telemanas.mohfw.gov.in" },
  { label: "ABHA – Ayushman Bharat Health Account", href: "https://abha.abdm.gov.in" },
];

export type SearchEntry = { title: string; href: string; description: string; keywords?: string };

export const siteIndex: SearchEntry[] = [
  ...healthTopics.map((t) => ({ title: t.title, href: t.href, description: t.text, keywords: t.keywords })),
  ...healthTools.map((t) => ({ title: t.title, href: t.href, description: t.text, keywords: t.keywords })),
  { title: "AI Hospital", href: "/ai-hospital", description: "Digital Front Door to Healthcare: urgency check, departments, visit preparation, and real-doctor guidance.", keywords: "ai hospital triage symptoms urgent sick doctor department emergency" },
  { title: "Text-only consultation", href: "/ai-hospital/departments/general-medicine/room?view=text", description: "The same consultation with no pictures — for slow internet or screen readers.", keywords: "symptoms urgent sick check triage text slow internet" },
  { title: "Emergency Mode", href: "/ai-hospital/emergency", description: "Emergency numbers and what to do while waiting for help.", keywords: "emergency ambulance 108 112 help" },
  { title: "Prepare for a hospital visit", href: "/ai-hospital/prepare", description: "Make a one-page summary to show the doctor.", keywords: "summary visit doctor prepare" },
  { title: "Find the right department", href: "/ai-hospital/departments", description: "17 hospital departments explained.", keywords: "department opd ent dental eye skin bones paediatrics" },
  { title: "Talk to a real doctor", href: "/ai-hospital/doctor", description: "How to prepare for a consultation, online or in person.", keywords: "doctor online consultation esanjeevani telemedicine" },
  { title: "Health Passport", href: "/ai-hospital/passport", description: "Keep allergies, medicines, conditions, and visit summaries on your own phone.", keywords: "records passport allergies blood group emergency contact vaccination" },
  { title: "Follow-up reminders", href: "/ai-hospital/follow-up", description: "Add appointment, test, vaccination, and prescribed-medicine reminders to your calendar.", keywords: "reminder appointment calendar follow up medicine time" },
  { title: "Medicine information", href: "/ai-hospital/medicines", description: "Understand your prescription and common medicines.", keywords: "medicine prescription tablet od bd tds paracetamol antibiotic inhaler" },
  { title: "Lab report explainer", href: "/ai-hospital/lab-reports", description: "What common lab tests measure, and questions to ask.", keywords: "lab report test result hb sugar hba1c platelet creatinine thyroid cholesterol" },
  { title: "Child vaccination planner", href: "/ai-hospital/vaccinations", description: "When your child's free vaccines are usually due, with calendar reminders.", keywords: "vaccine vaccination immunisation immunization injection tika bcg polio measles mr pentavalent mcp card baby" },
  { title: "Free health check-ups", href: "/ai-hospital/screening", description: "Free checks for blood pressure, diabetes, and common cancers for people aged 30 and above.", keywords: "screening check-up checkup bp blood pressure sugar diabetes cancer oral breast cervical ncd" },
  { title: "Calm corner", href: "/ai-hospital/calm", description: "Short breathing and grounding exercises for stress, and Tele-MANAS 14416.", keywords: "stress anxiety worry calm breathing relax panic sad mental tele-manas" },
  { title: "First aid", href: "/ai-hospital/first-aid", description: "Simple first-aid steps for bleeding, burns, fits, choking, snake bites, and more.", keywords: "first aid bleeding burn scald fits seizure choking snake bite nosebleed fracture sprain poison" },
  { title: "Find Care", href: "/find-care", description: "Emergency numbers, free helplines, online doctors, and hospitals in Mizoram.", keywords: "hospital clinic doctor emergency phone call number ambulance helpline mental quit tb phc chc" },
  { title: "Health Library", href: "/health-library", description: "Simple, sourced health guides by category.", keywords: "learn topics information guide library" },
  { title: "Reception — tell us what's wrong", href: "/ai-hospital/reception", description: "Say what is wrong in your own words; we show how urgently and where to get care.", keywords: "symptoms reception start help sick not sure" },
  { title: "Virtual doctor", href: "/ai-hospital/departments/general-medicine/room", description: "A guided consultation that helps you describe the problem and prepares a visit summary.", keywords: "doctor virtual consultation 3d talk describe" },
  { title: "My Visit", href: "/my-visit", description: "This visit's summary and next steps — kept only while the tab is open.", keywords: "summary visit my result print share" },
  { title: "About this prototype", href: "/about", description: "What Mizoram AI Hospital is, how it stays safe, and where a professional takes over.", keywords: "about safety prototype how it works" },
  { title: "Privacy Policy", href: "/privacy", description: "How this website handles your information." },
  { title: "Accessibility Statement", href: "/accessibility", description: "Accessibility features of this website." },
  { title: "Disclaimer", href: "/disclaimer", description: "Terms for using health information on this website." },
  { title: "Sitemap", href: "/sitemap", description: "All pages on this website." },
];
