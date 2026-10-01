// Official teleconsultation services. Public pages only show facts that are
// marked verified. Everything else is held back until checked against the
// live official source.

export type VerifiedFact = { text: string; sourceId: string; checked: string };

export type TeleconsultService = {
  id: string;
  name: string;
  operator: string;
  sourceId: string;
  officialUrl: { value: string; verified: boolean; checked: string | null };
  verifiedFacts: VerifiedFact[];
  // TODO(verify): Internal notes only — never rendered. Must be checked on the
  // official site before any of it is moved into verifiedFacts.
  unverifiedNotes: string[];
};

export const teleconsultServices: TeleconsultService[] = [
  {
    id: "esanjeevani",
    name: "eSanjeevani",
    operator: "Ministry of Health & Family Welfare, Government of India",
    sourceId: "esanjeevani",
    officialUrl: { value: "https://esanjeevani.mohfw.gov.in", verified: false, checked: null },
    verifiedFacts: [],
    unverifiedNotes: [
      "Access via website and mobile app",
      "Registration with mobile number and OTP",
      "Patient joins a queue for a video consultation with a doctor",
      "e-prescription provided after consultation",
      "Free of charge",
      "Operating hours and specialities offered",
    ],
  },
];

export function publicFacts(s: TeleconsultService): VerifiedFact[] {
  return s.verifiedFacts.filter((f) => !!f.checked);
}
