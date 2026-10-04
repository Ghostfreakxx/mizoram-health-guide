// Government health services and helplines referenced by AI Hospital.
// Descriptions are deliberately conservative. Each points to a source record.

export type Service = {
  id: string;
  name: string;
  description: string;
  phone?: { display: string; tel: string };
  sourceId: string;
};

export const services: Service[] = [
  { id: "ambulance-108", name: "108 Ambulance", description: "Free emergency ambulance.", phone: { display: "108", tel: "108" }, sourceId: "nhm-108" },
  { id: "erss-112", name: "112 Emergency", description: "National emergency number for police, fire, and medical help.", phone: { display: "112", tel: "112" }, sourceId: "erss-112" },
  { id: "telemanas", name: "Tele-MANAS", description: "Free, confidential mental health support, 24 hours a day.", phone: { display: "14416", tel: "14416" }, sourceId: "telemanas" },
  { id: "quitline", name: "National Tobacco Quitline", description: "Free help to quit tobacco.", phone: { display: "1800-11-2356", tel: "1800112356" }, sourceId: "ntcp-quitline" },
  { id: "aids-helpline", name: "National AIDS Helpline", description: "Free, confidential information about HIV.", phone: { display: "1097", tel: "1097" }, sourceId: "naco-helpline" },
  { id: "tb-helpline", name: "TB Helpline (Ni-kshay Sampark)", description: "Free information about TB testing and treatment.", phone: { display: "1800-11-6666", tel: "1800116666" }, sourceId: "nikshay-sampark" },
  { id: "ntep", name: "National TB Elimination Programme", description: "Free TB testing and treatment at government health facilities.", sourceId: "ntep-presumptive-tb" },
  { id: "malaria", name: "Malaria testing and treatment", description: "Free malaria testing and treatment through the public health system.", sourceId: "nvbdcp-malaria" },
  { id: "naco-ictc", name: "HIV testing and treatment (ICTC/ART)", description: "Free, confidential HIV testing, counselling, and treatment.", sourceId: "naco-guidelines" },
  { id: "jssk", name: "Janani Shishu Suraksha Karyakram (JSSK)", description: "Free delivery and care for pregnant women and sick newborns in public health facilities.", sourceId: "jssk" },
  { id: "pmjay", name: "Ayushman Bharat PM-JAY", description: "Health cover for hospital treatment for eligible families.", sourceId: "pmjay" },
  { id: "uip", name: "Universal Immunization Programme", description: "Free vaccines for children and pregnant women.", sourceId: "uip" },
  { id: "rbsk", name: "Rashtriya Bal Swasthya Karyakram (RBSK)", description: "Health screening and early intervention for children.", sourceId: "rbsk" },
  { id: "np-ncd", name: "NCD screening (30+)", description: "Screening for blood pressure, diabetes, and common cancers for people aged 30 and above.", sourceId: "np-ncd" },
  { id: "npcbvi", name: "National Programme for Control of Blindness", description: "Eye care services, including cataract surgery, in public facilities.", sourceId: "npcbvi" },
  { id: "nohp", name: "National Oral Health Programme", description: "Dental and oral health services in public facilities.", sourceId: "nohp" },
  { id: "nppcd", name: "National Programme for Prevention and Control of Deafness", description: "Ear and hearing care services.", sourceId: "nppcd" },
  { id: "nmba", name: "Nasha Mukt Bharat Abhiyaan", description: "National programme against substance use, with links to support services.", sourceId: "nmba" },
  { id: "nlep", name: "National Leprosy Eradication Programme", description: "Free examination and treatment for leprosy.", sourceId: "nlep" },
  { id: "esanjeevani", name: "eSanjeevani", description: "Government online consultation service with registered doctors.", sourceId: "esanjeevani" },
];

const byId = new Map(services.map((s) => [s.id, s]));
export const getService = (id: string) => byId.get(id);
