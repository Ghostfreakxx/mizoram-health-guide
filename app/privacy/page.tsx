import type { Metadata } from "next";
import ContentPage from "../components/ContentPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" intro="How this website handles your information.">
      <h2>Summary</h2>
      <p>
        You can use this website without creating an account or giving any
        personal information. We do not use advertising or tracking cookies.
      </p>

      <h2>Self-check tools and Health Assistant</h2>
      <p>
        The Diabetes Risk Check, Tobacco &amp; Kuhva Cost Calculator, Myth or
        Fact Quiz, and Health Assistant run entirely in your web browser. What
        you type or select is not sent to our servers and is not stored. It is
        cleared when you close or reload the page.
      </p>

      <h2>AI Hospital</h2>
      <p>
        AI Hospital (triage, reception, visit preparation, and Emergency Mode)
        runs entirely in your browser. Your symptoms and answers are kept in
        memory only while the page is open. They are not saved on your device,
        not sent to our servers, not put in web addresses, and not used for
        analytics. If you choose &quot;Share&quot; on your doctor summary, you
        are first shown exactly what will be shared, and the text is then
        passed to the app you choose (for example WhatsApp).
      </p>

      <h2>Health Passport and reminders</h2>
      <p>
        The Health Passport saves information on your device only if you turn
        on saving. It stays in your browser on that device and is never sent
        to us or anyone else. Anyone who uses the same device and browser
        could open it. &quot;Delete everything&quot; removes all of it and
        turns saving off. Follow-up reminders are created as a calendar file
        on your device, which you can import into your phone&apos;s calendar.
      </p>

      <h2>Offline use</h2>
      <p>
        To work without internet, this website saves copies of its own public
        pages (such as Emergency Mode and Helplines) on your device. These
        copies contain only the website itself — never anything you typed or
        answered.
      </p>

      <h2>Settings saved on your device</h2>
      <p>
        If you change the text size or turn on high contrast, that choice is
        saved in your browser&apos;s local storage so it stays the same on your
        next visit. It never leaves your device, and you can clear it by
        clearing your browser data.
      </p>

      <h2>Server logs</h2>
      <p>
        Like all websites, our hosting provider automatically records basic
        technical information when a page is requested, such as IP address,
        browser type, and time of visit. This is used only to keep the website
        secure and working, and is not used to identify you.
      </p>

      <h2>Sharing and external links</h2>
      <p>
        &quot;Share on WhatsApp&quot; buttons open WhatsApp with a message you
        can edit before sending. Links to other websites, such as government
        health portals, open in a new tab. Those websites have their own
        privacy policies.
      </p>

      <h2>Citizen Health Awareness Survey</h2>
      <p>
        The survey is not yet open. Before it collects any information, this
        policy will be updated to explain exactly what is collected, why, how
        long it is kept, and your rights, in line with the Digital Personal
        Data Protection Act, 2023. Taking part will always be voluntary and
        will require your consent.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes, the updated version will be published on this
        page. The &quot;Last updated&quot; date at the bottom of every page
        shows when the website was last changed.
      </p>
    </ContentPage>
  );
}
