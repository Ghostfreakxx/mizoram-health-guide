import type { Metadata } from "next";
import ContentPage from "../components/ContentPage";
import CallLink from "../components/ui/CallLink";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <ContentPage title="Disclaimer">
      <h2>For awareness only</h2>
      <p>
        The information on this website is for general public health
        awareness. It is not medical advice, and it does not replace a
        consultation with a doctor or other qualified health professional.
      </p>

      <h2>No diagnosis or prescriptions</h2>
      <p>
        This website, including the virtual doctor, Reception and self-check tools, does
        not diagnose any disease and does not recommend medicines or doses.
        Self-check tool results are screening estimates only. Always see a
        doctor about your health, and follow their advice.
      </p>

      <h2>Emergencies</h2>
      <p>
        Do not use this website in a medical emergency. Call <CallLink id="ambulance-108">108</CallLink>{" "}
        for an ambulance or <CallLink id="erss-112">112</CallLink> for emergency services.
      </p>

      <h2>Accuracy</h2>
      <p>
        We try to keep information accurate and up to date, but we cannot
        guarantee that it is complete or free of errors. Health guidance can
        change over time.
      </p>

      <h2>External websites</h2>
      <p>
        Links to other websites are provided for convenience. We are not
        responsible for their content or availability.
      </p>

      <h2>Not an official government website</h2>
      <p>
        Mizoram Health Guide is an independent public health awareness
        initiative. It is not currently operated or endorsed by the Government
        of Mizoram or the Government of India.
      </p>
    </ContentPage>
  );
}
