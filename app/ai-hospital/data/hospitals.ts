// Hospital Navigator data for Mizoram.
//
// RULE: never invent hospital information. Every field carries its own
// evidence. A field without evidence is NOT shown to the public. A hospital
// is only "VERIFIED" when every required field has evidence with a check
// date. See docs/HOSPITAL_DATA.md for how to add data.

export const DISTRICTS = [
  "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai",
  "Lunglei", "Mamit", "Saitual", "Serchhip", "Siaha",
] as const;
export type District = (typeof DISTRICTS)[number];

export type Evidence = {
  sourceTitle: string;
  organisation: string;
  url?: string;
  checked: string; // ISO date the field was checked against the source
};

export type Field<T> = { value: T; evidence?: Evidence };

// What kind of facility it is (the level of care), separate from who runs it.
// Never inferred from a name: "X Hospital" does not tell us its services.
export const FACILITY_LEVELS = [
  "Medical college hospital",
  "District hospital",
  "Sub-divisional hospital",
  "Community Health Centre (CHC)",
  "Primary Health Centre (PHC)",
  "Sub-centre / Health and Wellness Centre",
  "Specialist hospital",
  "Other hospital or clinic",
] as const;
export type FacilityLevel = (typeof FACILITY_LEVELS)[number];

export type Hospital = {
  id: string;
  name: Field<string>;
  district: Field<District>;
  level?: Field<FacilityLevel>;
  ownership: Field<"Public" | "Private" | "Mission / NGO">;
  address?: Field<string>;
  coordinates?: Field<{ lat: number; lng: number }>;
  phone?: Field<string>;
  emergency?: Field<boolean>;
  departments?: Field<string[]>; // department slugs
  services?: Field<string[]>;
  programmes?: Field<string[]>; // service ids
  lastVerified: string | null;
};

export const REQUIRED_FIELDS = ["name", "district", "level", "ownership", "address", "phone", "emergency"] as const;

export type Status = "VERIFIED" | "NEEDS VERIFICATION";

export function isEvidenced<T>(f?: Field<T>): f is Field<T> & { evidence: Evidence } {
  return !!f && !!f.evidence && !!f.evidence.checked && !!f.evidence.sourceTitle;
}

export function verificationStatus(h: Hospital): Status {
  const complete = REQUIRED_FIELDS.every((k) => isEvidenced(h[k] as Field<unknown> | undefined));
  return complete && !!h.lastVerified ? "VERIFIED" : "NEEDS VERIFICATION";
}

// Only fields with evidence may be displayed (name and district are shown as
// identifiers even while unverified, clearly labelled).
export function displayable(h: Hospital) {
  return {
    address: isEvidenced(h.address) ? h.address.value : undefined,
    phone: isEvidenced(h.phone) ? h.phone.value : undefined,
    emergency: isEvidenced(h.emergency) ? h.emergency.value : undefined,
    coordinates: isEvidenced(h.coordinates) ? h.coordinates.value : undefined,
    departments: isEvidenced(h.departments) ? h.departments.value : undefined,
    services: isEvidenced(h.services) ? h.services.value : undefined,
    programmes: isEvidenced(h.programmes) ? h.programmes.value : undefined,
    ownership: isEvidenced(h.ownership) ? h.ownership.value : undefined,
    level: isEvidenced(h.level) ? h.level.value : undefined,
  };
}

// Seed list: well-known public facilities, identified by name and district
// only. All other details are deliberately empty until verified.
export const hospitals: Hospital[] = [
  {
    id: "civil-hospital-aizawl",
    name: { value: "Civil Hospital Aizawl" },
    district: { value: "Aizawl" },
    ownership: { value: "Public" },
    lastVerified: null,
  },
  {
    id: "zoram-medical-college",
    name: { value: "Zoram Medical College" },
    district: { value: "Aizawl" },
    ownership: { value: "Public" },
    lastVerified: null,
  },
  {
    id: "mizoram-state-cancer-institute",
    name: { value: "Mizoram State Cancer Institute" },
    district: { value: "Aizawl" },
    ownership: { value: "Public" },
    lastVerified: null,
  },
];

// Map link built only from a hospital's verified coordinates (no user data).
export function mapLink(c: { lat: number; lng: number }): string {
  return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`;
}
