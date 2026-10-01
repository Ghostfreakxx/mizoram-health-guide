import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "../components/ContentPage";
import { healthTools } from "../tools";
import { healthTopics } from "../topics";

export const metadata: Metadata = { title: "Sitemap" };

const groups = [
  { title: "Main", links: [{ href: "/", title: "Home" }, { href: "/hospitals", title: "Hospital & Help Directory" }, { href: "/helplines", title: "Helplines" }, { href: "/search", title: "Search" }] },
  { title: "Health Topics", links: healthTopics },
  { title: "Self-Check Tools", links: [{ href: "/tools", title: "All Self-Check Tools" }, ...healthTools] },
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
