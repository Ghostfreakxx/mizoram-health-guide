import type { TopicContent } from "./types";

export const heart: TopicContent = {
  slug: "/heart",
  icon: "❤️",
  title: "Heart Health",
  intro:
    "Heart attacks and strokes can happen suddenly, but they usually build up over years. Know the emergency signs and how to protect your heart.",
  readingTime: "5 minute",
  facts: [
    { value: "17.9 million", label: "people die from heart disease and stroke every year — the world's top cause of death", source: "World Health Organization" },
    { value: "4 in 5", label: "of these deaths are from heart attacks and strokes", source: "World Health Organization" },
    { value: "< 5 g", label: "of salt a day (about one teaspoon) is the healthy limit for adults", source: "World Health Organization" },
  ],
  overview: [
    "Your heart pumps blood to every part of your body through blood vessels. Over time, high blood pressure, high cholesterol, smoking, and diabetes can damage and narrow these vessels.",
    "A heart attack happens when blood flow to part of the heart is blocked. A stroke happens when blood flow to part of the brain is blocked or a blood vessel bursts. Both are emergencies — every minute counts.",
    "High blood pressure is called the 'silent killer' because it usually has no symptoms. The only way to know your blood pressure is to check it.",
  ],
  signsTitle: "Emergency warning signs",
  signs: [
    { icon: "💔", text: "Chest pain, pressure, or tightness" },
    { icon: "💪", text: "Pain spreading to the arm, neck, jaw, or back" },
    { icon: "😮‍💨", text: "Shortness of breath" },
    { icon: "💦", text: "Sudden cold sweat, nausea, or light-headedness" },
    { icon: "😐", text: "Stroke: face drooping on one side" },
    { icon: "🦾", text: "Stroke: weakness in one arm or leg" },
    { icon: "🗣️", text: "Stroke: slurred or strange speech" },
    { icon: "😵", text: "Sudden severe headache, confusion, or fainting" },
  ],
  signsNote:
    "These are emergencies. Call 108 immediately — do not wait to see if they pass. For stroke, remember FAST: Face, Arms, Speech, Time to call 108.",
  risks: {
    changeable: [
      { icon: "🩺", title: "High blood pressure", text: "The biggest risk for stroke and heart attack." },
      { icon: "🚬", title: "Tobacco", text: "Smoking and chewing tobacco damage blood vessels." },
      { icon: "🧂", title: "Too much salt", text: "Salted meat, pickles, and packaged food raise blood pressure." },
      { icon: "🩸", title: "Diabetes and high cholesterol", text: "Both damage blood vessels over time." },
      { icon: "🍺", title: "Alcohol", text: "Raises blood pressure and harms the heart muscle." },
      { icon: "🛋️", title: "Inactivity and stress", text: "Both strain the heart." },
    ],
    fixed: [
      { icon: "🎂", title: "Age", text: "Risk rises after 40 for men and after menopause for women." },
      { icon: "👨‍👩‍👧", title: "Family history", text: "A parent or sibling who had heart disease at a young age." },
    ],
  },
  prevention: [
    { title: "Check your blood pressure", text: "Adults over 30 should check it at least once a year. Normal is below 120/80 mmHg. It is free at government health centres." },
    { title: "Eat less salt", text: "Use less salt in cooking, and eat less salted meat, pickles, and packaged snacks." },
    { title: "Quit tobacco", text: "Within a year of quitting, your risk of heart attack drops a lot." },
    { title: "Stay active", text: "30 minutes of brisk walking on most days strengthens your heart." },
    { title: "Eat heart-healthy food", text: "More vegetables, fruit, and whole grains. Less fried food and fatty meat." },
    { title: "Take medicines as prescribed", text: "If you have high blood pressure or diabetes, keep taking your medicines even when you feel well." },
  ],
  help: {
    urgent: [
      "Chest pain or pressure lasting more than a few minutes",
      "Any sign of stroke: face drooping, arm weakness, or speech problems",
      "Sudden severe breathlessness, fainting, or collapse",
    ],
    soon: [
      "Chest discomfort during exercise that goes away with rest",
      "Swollen feet or ankles with breathlessness",
      "Blood pressure reading of 140/90 or higher",
      "Fast or irregular heartbeat that keeps coming back",
    ],
    routine: [
      "Adults over 30: check blood pressure every year",
      "Check blood sugar and cholesterol as your doctor advises",
      "If heart disease runs in your family, start check-ups earlier",
    ],
  },
  myths: [
    { myth: "I would know if I had high blood pressure.", fact: "Most people with high blood pressure feel completely normal. Only a check can tell." },
    { myth: "Heart attacks only happen to old people.", fact: "Heart attacks are happening at younger ages, especially in smokers." },
    { myth: "Chest pain is the only sign of a heart attack.", fact: "Women and people with diabetes may have breathlessness, sweating, or nausea instead." },
    { myth: "I can stop BP medicine once my reading is normal.", fact: "The reading is normal because of the medicine. Never stop without asking your doctor." },
  ],
  faqs: [
    { q: "What should I do if someone has chest pain?", a: "Call 108 immediately. Help the person sit down and rest, and loosen tight clothing. Do not let them walk or drive to the hospital themselves." },
    { q: "What do blood pressure numbers mean?", a: "The top number is the pressure when your heart beats; the bottom number is when it rests. Below 120/80 is normal. 140/90 or above usually means high blood pressure and needs a doctor's advice." },
    { q: "Is salted and smoked meat bad for my heart?", a: "Salted and smoked meats contain a lot of salt, which raises blood pressure. Eat them less often and in small amounts." },
    { q: "How does stress affect my heart?", a: "Long-term stress can raise blood pressure and lead to habits like smoking or overeating. Exercise, sleep, and talking to people you trust can help." },
  ],
  sources: [
    { label: "World Health Organization — Cardiovascular diseases fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)" },
    { label: "World Health Organization — Salt reduction fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/salt-reduction" },
    { label: "World Health Organization — Hypertension fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/hypertension" },
  ],
  related: ["/diabetes", "/tobacco"],
};
