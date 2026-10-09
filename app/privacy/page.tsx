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

      <h2>Reception, the virtual doctor and self-check tools</h2>
      <p>
        Reception, the virtual doctor, triage, visit preparation, Emergency
        Mode and the Diabetes Risk Check run in your web browser. Your
        symptoms and answers are kept in memory only while the page is open.
        They are not saved on your device, not sent to our servers (unless you
        choose online help, below), not put in web addresses, not written to
        logs, and not used for analytics. If you
        choose &quot;Share&quot; on your visit summary, you are first shown
        exactly what will be shared, and the text is then passed to the app
        you choose (for example WhatsApp).
      </p>

      <h2>My Visit</h2>
      <p>
        My Visit shows the latest summary from this visit. It is held in the
        open browser tab&apos;s memory only. Reloading or closing the tab, or
        pressing &quot;Clear this visit&quot;, removes it.
      </p>

      <h2>Online help understanding your words (only if you choose it)</h2>
      <p>
        Where this website has it switched on, the virtual doctor may offer
        online help when it cannot understand one of your answers. Only if you
        agree, that question, its answer choices and the words you just wrote
        are sent through our server to an online AI service (OpenAI), which
        suggests which answer you meant. Long numbers, e-mail addresses and
        links are removed first; nothing else from your visit is sent. Nothing
        is recorded until you confirm the suggestion. We do not log or keep
        what is sent. OpenAI processes it outside India under its own terms.
        It is off unless you choose it, only for that visit, and you can turn
        it off in Settings. Please do not write your name or phone number.
      </p>

      <h2>Speaking instead of typing</h2>
      <p>
        Voice input is off until you turn it on. Before you do, we explain
        that your browser&apos;s own speech service turns your voice into text.
        In Chrome, this sends the audio of what you say to Google. We do not
        receive, record or keep the audio. The virtual doctor&apos;s spoken
        replies are made by your device. You can always type instead.
      </p>

      <h2>The 3D virtual doctor</h2>
      <p>
        The 3D doctor is a file downloaded from this website, like a picture.
        It is not downloaded when your phone asks to save data, on very slow
        connections, or when you choose the simple display.
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

      <h2>Live consultations with doctors</h2>
      <p>
        When live video consultations are available, the video goes directly
        between you and the Health Department&apos;s own video server. This
        website does not receive, record, or store the video. The link you
        receive contains only a random code. The camera and microphone check
        in the consulting room runs only on your phone.
      </p>

      <h2>Offline use</h2>
      <p>
        To work without internet, this website saves copies of its own public
        pages (such as Emergency Mode and Find Care) on your device. These
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

      <h2>Counting how the service is used</h2>
      <p>
        This prototype does not count or report anything. The code to do so
        is built in but switched off. If the Health Department switches it
        on for a pilot, only fixed category codes are sent — for example
        &quot;a consultation was completed&quot;, its urgency level, or
        &quot;the 3D picture could not load&quot; — with the day, never the
        time. Nothing you type or say, no error messages, no web addresses,
        no cookies and no identifier that could link two events or recognise
        you is ever sent. If your browser asks sites not to track you (Do Not
        Track or Global Privacy Control), nothing is sent at all.
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
