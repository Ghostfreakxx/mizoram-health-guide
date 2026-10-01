import type { TopicContent } from "./types";

export const motherChild: TopicContent = {
  slug: "/mother-child",
  icon: "🤱",
  title: "Mother & Child Health",
  intro:
    "A healthy pregnancy and a safe birth give a child the best start. Know the danger signs, the check-ups you need, and how to protect your baby.",
  readingTime: "6 minute",
  facts: [
    { value: "4+", label: "health check-ups during every pregnancy", source: "Ministry of Health & Family Welfare" },
    { value: "Free", label: "delivery and care for mother and newborn in government hospitals", source: "Janani Shishu Suraksha Karyakram (JSSK)" },
    { value: "6 months", label: "of only breast milk — no water, honey, or other food", source: "World Health Organization" },
  ],
  overview: [
    "Regular check-ups during pregnancy help find problems like high blood pressure, anaemia, and diabetes early, when they are easier to manage.",
    "Giving birth in a hospital with trained staff is the safest choice. Delivery and care for mother and newborn are free in government hospitals.",
    "After birth, breastfeeding and on-time vaccines protect your baby from serious illness. Your ASHA and Anganwadi worker can help at every step.",
  ],
  signsTitle: "Danger signs in pregnancy",
  signs: [
    { icon: "🩸", text: "Any bleeding from the vagina" },
    { icon: "🤕", text: "Severe headache or blurred vision" },
    { icon: "⚡", text: "Fits (convulsions)" },
    { icon: "🎈", text: "Swelling of the face and hands" },
    { icon: "🌡️", text: "High fever" },
    { icon: "👶", text: "Baby moving less than usual" },
    { icon: "💧", text: "Water breaking before labour" },
    { icon: "😣", text: "Severe stomach pain" },
  ],
  signsNote:
    "Any of these signs is an emergency. Go to the hospital immediately or call 108.",
  risks: {
    changeable: [
      { icon: "🩸", title: "Anaemia", text: "Iron and folic acid tablets from your health centre help prevent it." },
      { icon: "🚬", title: "Tobacco, kuhva, and alcohol", text: "Harm the baby's growth and raise the risk of miscarriage." },
      { icon: "🏠", title: "Delivering at home", text: "Problems during birth can become dangerous quickly without trained help." },
      { icon: "📅", title: "Missing check-ups", text: "Problems may not be found in time." },
    ],
    fixed: [
      { icon: "🎂", title: "Age under 18 or over 35", text: "Higher risk of complications." },
      { icon: "🩺", title: "Health conditions", text: "Such as high blood pressure, diabetes, or a previous difficult birth." },
    ],
  },
  prevention: [
    { title: "Register your pregnancy early", text: "Register with your ASHA or health centre as soon as you know you are pregnant." },
    { title: "Go for at least 4 check-ups", text: "Check-ups include blood pressure, weight, blood and urine tests, and scans." },
    { title: "Eat well and take iron tablets", text: "Eat a variety of foods and take the iron, folic acid, and calcium tablets given by your health worker." },
    { title: "Plan a hospital birth", text: "Know which hospital you will go to and how you will get there. Keep the 108 number ready." },
    { title: "Breastfeed within the first hour", text: "Give only breast milk for the first 6 months — no water, honey, or other foods." },
    { title: "Vaccinate on time", text: "Follow your child's vaccination card. Vaccines are free at government health centres." },
  ],
  help: {
    urgent: [
      "Any danger sign in pregnancy listed above",
      "Newborn: not feeding, very sleepy, or cannot be woken",
      "Newborn: fits, fast or difficult breathing, or chest pulling in",
      "Newborn: feels very hot or very cold, or yellow skin on the palms and soles",
    ],
    soon: [
      "Mother feeling very sad, anxious, or unable to cope after birth",
      "Breastfeeding problems or painful breasts",
      "Baby not gaining weight",
    ],
    routine: [
      "At least 4 check-ups during pregnancy",
      "Check-ups for mother and baby after birth",
      "All vaccines on time, as shown on the vaccination card",
    ],
  },
  myths: [
    { myth: "Newborns need water or honey.", fact: "Breast milk has all the water and food a baby needs for the first 6 months. Honey can be dangerous for babies." },
    { myth: "The first yellow milk (colostrum) is bad and should be thrown away.", fact: "Colostrum is the baby's first vaccine — rich in protection. Give it to the baby." },
    { myth: "Vaccines make children sick.", fact: "Vaccines are safe. A mild fever may happen, but they protect against serious diseases." },
  ],
  faqs: [
    { q: "Is delivery really free in government hospitals?", a: "Yes. Under JSSK, delivery (including caesarean), medicines, tests, food, and transport are free for pregnant women and sick newborns in government health facilities." },
    { q: "Which vaccines does my baby need?", a: "Your baby needs several vaccines at birth, 6, 10, and 14 weeks, 9 months, and later. Your health worker will give you a card with the schedule. All are free at government centres." },
    { q: "Is it normal to feel sad after giving birth?", a: "Many mothers feel tearful for a few days. If sadness lasts more than 2 weeks or you cannot cope, talk to a health worker or call Tele-MANAS on 14416." },
  ],
  sources: [
    { label: "Ministry of Health & Family Welfare — Maternal Health and Janani Shishu Suraksha Karyakram", href: "https://nhm.gov.in" },
    { label: "World Health Organization — Breastfeeding", href: "https://www.who.int/health-topics/breastfeeding" },
    { label: "Universal Immunization Programme, Ministry of Health & Family Welfare", href: "https://mohfw.gov.in" },
  ],
  related: ["/malaria", "/mental"],
};
