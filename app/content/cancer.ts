import type { TopicContent } from "./types";

export const cancer: TopicContent = {
  slug: "/cancer",
  icon: "🎗️",
  title: "Cancer Awareness",
  intro:
    "Cancer is easier to treat when it is found early. Learn the warning signs, what increases your risk, and when to see a doctor.",
  readingTime: "6 minute",
  facts: [
    { value: "1 in 9", label: "people in India may develop cancer in their lifetime", source: "ICMR National Cancer Registry Programme" },
    { value: "30–50%", label: "of cancers can be prevented by avoiding risk factors like tobacco", source: "World Health Organization" },
    { value: "Aizawl", label: "district has one of the highest cancer rates in India", source: "ICMR National Cancer Registry Programme" },
  ],
  overview: [
    "Cancer happens when some cells in the body start to grow out of control. These cells can form a lump (tumour) and can spread to other parts of the body.",
    "There are many types of cancer. Some of the most common in Mizoram affect the stomach, lungs, food pipe (oesophagus), mouth, and throat. In women, cancers of the cervix and breast are also important.",
    "Cancer is not always a death sentence. Many cancers can be treated successfully, especially when they are found early. That is why knowing the warning signs and going for check-ups matters so much.",
  ],
  local: {
    title: "Why this matters in Mizoram",
    text: "Mizoram has one of the highest cancer burdens in India. Studies in the state have linked stomach and food-pipe cancers to tobacco use (including tuibur, tobacco-smoke water), smoked and salted meat, and sa-um (fermented pork fat). Reducing these habits can lower your risk.",
  },
  signsTitle: "Warning signs",
  signs: [
    { icon: "🩹", text: "A wound or ulcer that does not heal" },
    { icon: "🩸", text: "Unusual bleeding or discharge" },
    { icon: "🔵", text: "A lump or thickening anywhere in the body" },
    { icon: "😮‍💨", text: "A cough or hoarse voice that lasts more than 3 weeks" },
    { icon: "🍽️", text: "Difficulty swallowing or constant indigestion" },
    { icon: "⚖️", text: "Weight loss without trying" },
    { icon: "🚽", text: "Changes in bowel or bladder habits" },
    { icon: "🔴", text: "A mole or skin patch that changes size or colour" },
  ],
  signsNote:
    "These signs are usually caused by something other than cancer. But if a sign lasts more than 2–3 weeks, see a doctor to be sure.",
  risks: {
    changeable: [
      { icon: "🚭", title: "Tobacco in any form", text: "Smoking, tuibur, khaini, gutkha — the single biggest cause of preventable cancer." },
      { icon: "🌿", title: "Kuhva (betel nut)", text: "Causes mouth cancer, even without tobacco." },
      { icon: "🍺", title: "Alcohol", text: "Raises the risk of mouth, throat, liver, and other cancers." },
      { icon: "🥓", title: "Smoked, salted, and fermented meat", text: "Linked to stomach and food-pipe cancer." },
      { icon: "🛋️", title: "Inactivity and extra weight", text: "Linked to several cancers, including breast and bowel." },
      { icon: "💉", title: "Some infections", text: "HPV (cervical cancer) and hepatitis B (liver cancer) can be prevented by vaccines." },
    ],
    fixed: [
      { icon: "🎂", title: "Age", text: "Most cancers are more common after age 40." },
      { icon: "👨‍👩‍👧", title: "Family history", text: "Some cancers run in families." },
    ],
  },
  prevention: [
    { title: "Stop all tobacco and kuhva", text: "This is the most important step. It is never too late — risk goes down after you quit. Call the free quitline on 1800-11-2356." },
    { title: "Eat more fresh food", text: "Eat more vegetables, fruit, and whole grains. Eat less smoked, salted, and fermented meat, and less sa-um." },
    { title: "Limit alcohol", text: "The less you drink, the lower your risk." },
    { title: "Stay active", text: "Aim for at least 30 minutes of activity, like brisk walking, on most days." },
    { title: "Get vaccinated", text: "The HPV vaccine protects girls against cervical cancer. The hepatitis B vaccine protects against liver cancer." },
    { title: "Go for screening", text: "Ask at your nearest health centre about free screening for mouth, breast, and cervical cancer for adults over 30." },
  ],
  help: {
    urgent: [
      "Vomiting or coughing up blood",
      "Heavy bleeding that will not stop",
      "Sudden severe pain",
    ],
    soon: [
      "Any warning sign above that lasts more than 2–3 weeks",
      "A new lump anywhere in the body",
      "Difficulty swallowing that keeps getting worse",
      "Bleeding after menopause or between periods",
    ],
    routine: [
      "Adults over 30: ask about free mouth, breast, and cervical cancer screening",
      "Tobacco or kuhva users: ask a doctor to check your mouth once a year",
      "If cancer runs in your family, tell your doctor",
    ],
  },
  myths: [
    { myth: "Cancer always means death.", fact: "Many cancers can be cured, especially when found early." },
    { myth: "Cancer is contagious.", fact: "You cannot catch cancer from another person by touching, eating together, or caring for them." },
    { myth: "If I feel fine, I don't have cancer.", fact: "Early cancer often causes no pain. That is why screening and check-ups matter." },
    { myth: "A biopsy makes cancer spread.", fact: "A biopsy is a safe and necessary test. It does not cause cancer to spread." },
  ],
  faqs: [
    { q: "Does a lump always mean cancer?", a: "No. Most lumps are not cancer. But only a doctor can tell for sure, so any new lump should be checked." },
    { q: "Where can I get screened for cancer?", a: "Ask at your nearest government hospital, Primary Health Centre, or Health & Wellness Centre. Screening for common cancers is available free for adults aged 30 and above under the national programme." },
    { q: "Is cancer treatment very expensive?", a: "Treatment can be costly, but government schemes such as Ayushman Bharat PM-JAY can cover cancer treatment for eligible families. Ask the hospital about schemes you qualify for." },
    { q: "Can young people get cancer?", a: "Yes, although it is less common. Tobacco and kuhva use at a young age increases the risk of mouth cancer early in life." },
  ],
  sources: [
    { label: "World Health Organization — Cancer fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/cancer" },
    { label: "ICMR – National Centre for Disease Informatics and Research, National Cancer Registry Programme", href: "https://ncdirindia.org" },
    { label: "Ministry of Health & Family Welfare — National Programme for Prevention and Control of Non-Communicable Diseases", href: "https://mohfw.gov.in" },
  ],
  related: ["/tobacco", "/hiv"],
};
