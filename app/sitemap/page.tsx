import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "../components/ContentPage";
import { healthTools } from "../tools";
import { healthTopics } from "../topics";

export const metadata: Metadata = { title: "Sitemap" };

const groups = [
  { title: "Main", links: [{ href: "/", title: "Home" }, { href: "/ai-hospital", title: "AI Hospital" }, { href: "/health-library", title: "Health Library" }, { href: "/find-care", title: "Find Care" }, { href: "/my-visit", title: "My Visit" }, { href: "/about", title: "About this prototype" }, { href: "/search", title: "Search" }] },
  {
    title: "AI Hospital",
    links: [
      { href: "/ai-hospital", title: "AI Hospital lobby" },
      { href: "/ai-hospital/reception", title: "Reception" },
      { href: "/ai-hospital/triage", title: "Triage Desk" },
      { href: "/ai-hospital/emergency", title: "Emergency Mode" },
      { href: "/ai-hospital/departments", title: "Departments" },
      { href: "/ai-hospital/prepare", title: "Prepare for a visit" },
      { href: "/ai-hospital/doctor", title: "Talk to a real doctor" },
      { href: "/ai-hospital/consult", title: "Consulting room (live doctor)" },
      { href: "/ai-hospital/passport", title: "Health Passport" },
      { href: "/ai-hospital/follow-up", title: "Follow-up reminders" },
      { href: "/ai-hospital/medicines", title: "Medicine information" },
      { href: "/ai-hospital/lab-reports", title: "Lab report explainer" },
      { href: "/ai-hospital/vaccinations", title: "Child vaccination planner" },
      { href: "/ai-hospital/screening", title: "Free health check-ups" },
      { href: "/ai-hospital/calm", title: "Calm corner" },
      { href: "/ai-hospital/first-aid", title: "First aid" },
      { href: "/ai-hospital/sources", title: "Sources and verification" },
    ],
  },
  { title: "Health Topics", links: healthTopics },
  { title: "Self-Check Tools", links: healthTools },
  { title: "Website Policies", links: [{ href: "/privacy", title: "Privacy Policy" }, { href: "/disclaimer", title: "Disclaimer" }, { href: "/accessibility", title: "Accessibility Statement" }] },
];

export default function SitemapPage() {
  return (
    <ContentPage title="Sitemap" intro="All pages on this website.">
      {groups.map((g) => (
        <div key={g.title}>
          <h2>{g.title}</h2>
          <ul className="mt-2">
            {g.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </ContentPage>
  );
}
