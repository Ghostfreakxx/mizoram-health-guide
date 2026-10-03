import { healthTools } from "./tools";
import { healthTopics } from "./topics";

export const helplines = [
  { number: "108", tel: "108", label: "Ambulance", text: "Free emergency ambulance, 24 hours", urgent: true },
  { number: "112", tel: "112", label: "National Emergency", text: "Police, fire, and medical emergencies", urgent: true },
  { number: "14416", tel: "14416", label: "Tele-MANAS", text: "Free mental health support, 24 hours" },
  { number: "1800-11-2356", tel: "1800112356", label: "Tobacco Quitline", text: "Free help to quit tobacco" },
  { number: "1097", tel: "1097", label: "AIDS Helpline", text: "Free, confidential HIV information" },
  { number: "1800-11-6666", tel: "1800116666", label: "TB Helpline", text: "Ni-kshay Sampark: TB testing and treatment" },
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
  { text: "New: AI Hospital — check how urgent it is, find the right department, and prepare for your doctor", href: "/ai-hospital" },
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
  { title: "AI Hospital", href: "/ai-hospital", description: "Digital Front Door to Healthcare: urgency check, departments, visit preparation, and real-doctor guidance.", keywords: "ai hospital triage symptoms urgent sick doctor department emergency" },
  { title: "Triage Desk", href: "/ai-hospital/triage", description: "Answer simple questions to find out how urgently to seek care.", keywords: "symptoms urgent sick check triage" },
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
  { title: "3D department tours", href: "/ai-hospital/departments", description: "Walk through a typical hospital visit in 3D.", keywords: "3d tour simulator visit department" },
  { title: "Hospital & Help Directory", href: "/hospitals", description: "Hospitals and emergency help in Mizoram.", keywords: "hospital clinic doctor emergency" },
  { title: "Helplines", href: "/helplines", description: "Free health helpline numbers: 108, 112, 14416, tobacco quitline.", keywords: "phone call number ambulance helpline mental quit" },
  { title: "Self-Check Tools", href: "/tools", description: "Quick, private health self-check tools.", keywords: "test check calculator quiz" },
  { title: "Privacy Policy", href: "/privacy", description: "How this website handles your information." },
  { title: "Accessibility Statement", href: "/accessibility", description: "Accessibility features of this website." },
  { title: "Disclaimer", href: "/disclaimer", description: "Terms for using health information on this website." },
  { title: "Sitemap", href: "/sitemap", description: "All pages on this website." },
];
