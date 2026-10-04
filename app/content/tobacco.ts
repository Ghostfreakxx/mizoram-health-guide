import type { TopicContent } from "./types";

export const tobacco: TopicContent = {
  slug: "/tobacco",
  icon: "🚭",
  title: "Tobacco & Oral Health",
  intro:
    "Smoking, tuibur, khaini, gutkha, and kuhva all harm your mouth and body. Learn the risks, the early signs of mouth cancer, and how to quit.",
  readingTime: "6 minute",
  facts: [
    { value: "Over 50%", label: "of adults in Mizoram use some form of tobacco", source: "Global Adult Tobacco Survey (GATS-2), 2016–17" },
    { value: "8 million+", label: "people die from tobacco use every year worldwide", source: "World Health Organization" },
    { value: "Group 1", label: "Betel nut is a proven cause of cancer in humans", source: "International Agency for Research on Cancer (IARC)" },
  ],
  overview: [
    "Tobacco harms almost every part of the body. It causes cancer of the mouth, throat, lungs, food pipe, and stomach, as well as heart attacks, strokes, and lung disease.",
    "There is no safe form of tobacco. Chewing tobacco (khaini, gutkha), tuibur, and bidi are just as harmful as cigarettes. Kuhva (betel nut) also causes mouth cancer on its own, and adding tobacco makes it much more dangerous.",
    "The good news: quitting at any age helps. Within weeks, breathing and blood flow improve. Over the years, your risk of cancer and heart disease keeps going down.",
  ],
  local: {
    title: "Tuibur and kuhva in Mizoram",
    text: "Tuibur — water that has absorbed tobacco smoke, kept in the mouth or sipped — is a habit special to Mizoram. Studies in the state have linked it to stomach and food-pipe cancer. Kuhva chewing is also very common and is a major cause of mouth cancer.",
  },
  signsTitle: "Early signs of mouth cancer",
  signs: [
    { icon: "🩹", text: "A mouth ulcer that does not heal in 2 weeks" },
    { icon: "⚪", text: "White or red patches inside the mouth" },
    { icon: "😬", text: "Difficulty opening the mouth fully" },
    { icon: "🔵", text: "A lump in the mouth, cheek, or neck" },
    { icon: "🍽️", text: "Pain while chewing or swallowing" },
    { icon: "🦷", text: "Loose teeth or bleeding gums without reason" },
    { icon: "🗣️", text: "A change in voice or hoarseness" },
    { icon: "😶", text: "Numbness in the tongue or lips" },
  ],
  signsNote:
    "Look inside your mouth once a month using a mirror and good light. If you see any of these signs for more than 2 weeks, see a doctor or dentist.",
  risks: {
    changeable: [
      { icon: "🚬", title: "Smoking", text: "Cigarettes, bidi, and hookah." },
      { icon: "💧", title: "Tuibur", text: "Tobacco-smoke water kept in the mouth." },
      { icon: "🫙", title: "Chewing tobacco", text: "Khaini, gutkha, zarda, and similar products." },
      { icon: "🌿", title: "Kuhva / paan", text: "Even without tobacco." },
      { icon: "🍺", title: "Alcohol", text: "Together with tobacco, the risk of mouth cancer is many times higher." },
      { icon: "🪥", title: "Poor mouth hygiene", text: "Sharp or broken teeth that rub the mouth can cause sores." },
    ],
    fixed: [
      { icon: "🎂", title: "Age", text: "Risk rises the longer you have used tobacco or kuhva." },
      { icon: "👨‍👩‍👧", title: "Starting young", text: "Starting tobacco as a teenager means more years of damage." },
    ],
  },
  prevention: [
    { title: "Decide to quit and set a date", text: "Choose a day within the next 2 weeks. Tell your family and friends so they can support you." },
    { title: "Remove tobacco and kuhva from home", text: "Throw away all tobacco, kuhva, lighters, and ashtrays." },
    { title: "Know your triggers", text: "Tea, meals, stress, or friends may make you want tobacco. Plan something else — chew sugar-free gum, drink water, or take a short walk." },
    { title: "Get free help", text: "Call the National Tobacco Quitline on 1800-11-2356. Doctors can also help with medicines that reduce cravings." },
    { title: "Don't give up if you slip", text: "Most people try a few times before they quit for good. Learn from it and try again." },
    { title: "Check your mouth every month", text: "Use a mirror. Look for ulcers, patches, or lumps, and see a doctor if anything lasts more than 2 weeks." },
  ],
  help: {
    urgent: [
      "Chest pain, sudden breathlessness, or signs of stroke (common in smokers)",
      "Heavy bleeding from the mouth",
    ],
    soon: [
      "A mouth ulcer, patch, or lump that lasts more than 2 weeks",
      "Difficulty opening the mouth that is getting worse",
      "Long-lasting cough or coughing up blood",
    ],
    routine: [
      "If you use tobacco or kuhva, ask a doctor to check your mouth once a year",
      "Ask about free oral cancer screening at your health centre if you are over 30",
      "Regular dental check-ups",
    ],
  },
  myths: [
    { myth: "Kuhva is safe if you don't add tobacco.", fact: "Betel nut alone causes mouth cancer and a stiff mouth that cannot open fully." },
    { myth: "Chewing tobacco is safer than smoking.", fact: "Smokeless tobacco causes mouth, throat, and food-pipe cancer, and heart disease." },
    { myth: "Tuibur is harmless because it is only water.", fact: "Tuibur contains harmful chemicals from tobacco smoke and has been linked to cancer." },
    { myth: "I've used tobacco for years — it's too late to quit.", fact: "Quitting at any age lowers your risk of cancer, heart attack, and stroke." },
  ],
  faqs: [
    { q: "What happens when I quit?", a: "Within days, your sense of taste and smell improve. Within weeks, breathing gets easier. After a year, your risk of heart disease falls a lot, and your cancer risk keeps falling over the years." },
    { q: "How do I handle cravings?", a: "Cravings usually pass in 5–10 minutes. Drink water, chew sugar-free gum, take deep breaths, or go for a short walk. They become less frequent after the first few weeks." },
    { q: "Is the quitline really free?", a: "Yes. The National Tobacco Quitline (1800-11-2356) is a free government service. Trained counsellors can help you make a plan to quit." },
    { q: "Is second-hand smoke harmful?", a: "Yes. Smoke from others can cause lung disease and heart disease, and is especially harmful to children and pregnant women. Keep your home smoke-free." },
  ],
  sources: [
    { label: "World Health Organization — Tobacco fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/tobacco" },
    { label: "Global Adult Tobacco Survey (GATS-2) India, 2016–17 — Ministry of Health & Family Welfare" },
    { label: "IARC Monographs, Volume 85 — Betel-quid and areca-nut chewing", href: "https://monographs.iarc.who.int" },
    { label: "National Tobacco Control Programme, Ministry of Health & Family Welfare", href: "https://mohfw.gov.in" },
  ],
  related: ["/cancer", "/heart"],
};
