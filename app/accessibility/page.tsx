import type { Metadata } from "next";
import ContentPage from "../components/ContentPage";

export const metadata: Metadata = { title: "Accessibility Statement" };

export default function AccessibilityPage() {
  return (
    <ContentPage
      title="Accessibility Statement"
      intro="We want everyone in Mizoram to be able to use this website, including people with disabilities and people using basic mobile phones."
    >
      <h2>Standards</h2>
      <p>
        This website is being designed to follow the Web Content Accessibility
        Guidelines (WCAG) 2.1 Level AA and the Guidelines for Indian Government
        Websites (GIGW) 3.0. It has not yet been formally audited.
      </p>

      <h2>Accessibility features</h2>
      <ul>
        <li>&quot;Skip to main content&quot; link at the top of every page.</li>
        <li>Text size controls (A-, A, A+) in the top bar.</li>
        <li>High contrast mode in the top bar.</li>
        <li>Works with screen readers: pages use proper headings, labels, and landmarks.</li>
        <li>Every feature can be used with a keyboard alone, with a visible focus outline.</li>
        <li>Moving content (slideshow and news ticker) can be paused, and stops automatically if your device is set to reduce motion.</li>
        <li>Links to external websites are marked and open in a new tab.</li>
        <li>Works on mobile phones and small screens.</li>
        <li>&quot;Read aloud&quot; buttons on AI Hospital questions, results, Emergency Mode, and 3D tours use your phone&apos;s built-in voice.</li>
        <li>Can be installed like an app, and key pages (Emergency Mode, Helplines, AI Hospital) work without internet.</li>
        <li>Every page is checked automatically for accessibility problems (axe-core, WCAG 2.1 A/AA) on desktop and mobile.</li>
      </ul>

      <h2>Screen readers</h2>
      <p>
        You can use this website with free screen readers such as NVDA
        (Windows), TalkBack (Android), and VoiceOver (iPhone and Mac).
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>Content is currently available in English only. A Mizo version is being prepared: each screen switches to Mizo only after its translation has been fully reviewed by fluent Mizo speakers and a health professional.</li>
        <li>High contrast mode changes colours across the whole page; some icons may look different.</li>
      </ul>

      <h2>Feedback</h2>
      <p>
        If you have difficulty using any part of this website, please let us
        know so we can fix it. A feedback option will be added here soon.
      </p>
    </ContentPage>
  );
}
