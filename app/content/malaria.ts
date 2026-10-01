import type { TopicContent } from "./types";

export const malaria: TopicContent = {
  slug: "/malaria",
  icon: "🦟",
  title: "Malaria & Dengue",
  intro:
    "Malaria and dengue are spread by mosquito bites. Both can become dangerous quickly. Learn the warning signs, and how to protect your family.",
  readingTime: "5 minute",
  facts: [
    { value: "Night", label: "Malaria mosquitoes bite mostly between dusk and dawn", source: "World Health Organization" },
    { value: "Day", label: "Dengue mosquitoes bite in the daytime and breed in clean standing water", source: "World Health Organization" },
    { value: "Free", label: "Malaria testing and treatment at government health centres and through ASHAs", source: "National Vector Borne Disease Control Programme" },
  ],
  overview: [
    "Malaria is caused by a parasite carried by Anopheles mosquitoes. It causes fever with chills and can become severe within a day, especially in children and pregnant women. Malaria can be cured if treated early.",
    "Dengue is caused by a virus carried by Aedes mosquitoes, which breed in clean water collected in containers, tyres, and pots. Most people recover, but some develop severe dengue with bleeding and shock.",
    "Any fever during the rainy season should be tested. A quick blood test can tell if it is malaria.",
  ],
  local: {
    title: "Malaria in Mizoram",
    text: "Malaria is common in parts of Mizoram, especially forest areas, jhum fields, and border districts. People who work or sleep in these areas should always sleep under a long-lasting insecticide net. ASHAs in many villages can test for malaria on the spot.",
  },
  signsTitle: "Warning signs",
  signs: [
    { icon: "🌡️", text: "Fever, often with shivering and chills (malaria)" },
    { icon: "🤕", text: "Severe headache and pain behind the eyes (dengue)" },
    { icon: "💪", text: "Severe muscle and joint pain (dengue)" },
    { icon: "🔴", text: "Skin rash (dengue)" },
    { icon: "🤮", text: "Nausea and vomiting" },
    { icon: "😴", text: "Extreme tiredness and weakness" },
  ],
  signsNote:
    "Dengue warning signs often appear as the fever goes down. Watch closely for 2 days after the fever drops.",
  risks: {
    changeable: [
      { icon: "🛏️", title: "Sleeping without a mosquito net", text: "Especially in forest areas and jhum huts." },
      { icon: "🪣", title: "Standing water around the home", text: "Water in pots, tyres, and containers breeds dengue mosquitoes." },
      { icon: "👕", title: "Uncovered skin", text: "Short sleeves at dusk and dawn increase bites." },
    ],
    fixed: [
      { icon: "👶", title: "Young children", text: "More likely to become severely ill." },
      { icon: "🤰", title: "Pregnant women", text: "Malaria in pregnancy is dangerous for mother and baby." },
      { icon: "🌲", title: "Living or working in forest or border areas", text: "Higher malaria risk." },
    ],
  },
  prevention: [
    { title: "Sleep under a treated mosquito net", text: "Every night, every family member — especially children and pregnant women." },
    { title: "Empty standing water every week", text: "Empty and scrub containers, cover water tanks, and throw away old tyres and pots." },
    { title: "Cover your skin", text: "Wear long sleeves and trousers, especially at dusk and dawn." },
    { title: "Use mosquito repellent", text: "On exposed skin, and use window screens where possible." },
    { title: "Test every fever", text: "Get a blood test for malaria the same day you get a fever. Ask your ASHA or health centre." },
  ],
  help: {
    urgent: [
      "Fever with confusion, fits, or drowsiness",
      "Severe stomach pain or vomiting that will not stop",
      "Bleeding from gums or nose, or blood in vomit or stool",
      "Cold, clammy skin, or difficulty breathing",
    ],
    soon: [
      "Any fever, especially with chills — get tested the same day",
      "Fever in a child, pregnant woman, or elderly person",
    ],
    routine: [
      "If you test positive for malaria, take the full course of medicine",
      "Follow up with the health centre if fever comes back",
    ],
  },
  myths: [
    { myth: "Malaria comes from drinking dirty water.", fact: "Malaria spreads only through the bite of an infected mosquito." },
    { myth: "Dengue mosquitoes breed in dirty drains.", fact: "Dengue mosquitoes prefer clean standing water in containers around the home." },
    { myth: "Once the fever is gone, dengue is over.", fact: "The most dangerous phase of dengue can start as the fever goes down." },
  ],
  faqs: [
    { q: "Can I take painkillers for dengue fever?", a: "Do not take aspirin or ibuprofen if dengue is possible — they can increase bleeding. Ask a doctor what is safe, rest, and drink plenty of fluids." },
    { q: "Where can I get a malaria test?", a: "At any government health centre, and from ASHAs in many villages using a rapid test. Testing and treatment are free." },
    { q: "Can I get malaria more than once?", a: "Yes. Having malaria once does not protect you. Keep using a mosquito net." },
  ],
  sources: [
    { label: "World Health Organization — Malaria fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/malaria" },
    { label: "World Health Organization — Dengue fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue" },
    { label: "National Center for Vector Borne Diseases Control, Ministry of Health & Family Welfare", href: "https://ncvbdc.mohfw.gov.in" },
  ],
  related: ["/mother-child", "/tb"],
};
