import type { TopicContent } from "./types";

export const diabetes: TopicContent = {
  slug: "/diabetes",
  icon: "🩸",
  title: "Diabetes Awareness",
  intro:
    "Diabetes means your blood sugar stays too high. Many people have it without knowing. Learn the signs, check your risk, and find out how to prevent it.",
  readingTime: "5 minute",
  facts: [
    { value: "101 million", label: "people in India are living with diabetes", source: "ICMR-INDIAB study, 2023" },
    { value: "136 million", label: "more have prediabetes — high sugar that can still be reversed", source: "ICMR-INDIAB study, 2023" },
    { value: "150 min", label: "of activity a week helps prevent type 2 diabetes", source: "World Health Organization" },
  ],
  overview: [
    "When you eat, your body turns food into sugar (glucose) for energy. A hormone called insulin helps sugar move from the blood into your cells. In diabetes, the body does not make enough insulin or cannot use it well, so sugar builds up in the blood.",
    "Type 2 diabetes is the most common type. It usually develops slowly over many years and is strongly linked to lifestyle. Type 1 diabetes is less common, often starts in childhood, and always needs insulin.",
    "Over time, high blood sugar damages the eyes, kidneys, nerves, heart, and feet. The good news: type 2 diabetes can often be prevented or delayed, and it can be controlled well with treatment.",
  ],
  signsTitle: "Warning signs",
  signs: [
    { icon: "🚽", text: "Passing urine often, especially at night" },
    { icon: "💧", text: "Feeling very thirsty" },
    { icon: "😴", text: "Feeling tired all the time" },
    { icon: "🩹", text: "Cuts and wounds that heal slowly" },
    { icon: "👓", text: "Blurred vision" },
    { icon: "⚖️", text: "Losing weight without trying" },
    { icon: "🦶", text: "Tingling or numbness in hands or feet" },
    { icon: "🦠", text: "Frequent infections of the skin, gums, or urine" },
  ],
  signsNote:
    "Many people with type 2 diabetes have no signs at all for years. A simple blood sugar test is the only way to know.",
  risks: {
    changeable: [
      { icon: "📏", title: "Extra weight around the waist", text: "Belly fat is a strong risk for Indians, even if you are not overweight overall." },
      { icon: "🛋️", title: "Not being active", text: "Sitting most of the day raises your risk." },
      { icon: "🥤", title: "Sugary drinks and refined food", text: "Soft drinks, sweets, white rice in large amounts, and fried snacks." },
      { icon: "🚬", title: "Smoking", text: "Increases the risk of diabetes and its complications." },
    ],
    fixed: [
      { icon: "🎂", title: "Age over 30", text: "Risk rises with age." },
      { icon: "👨‍👩‍👧", title: "Family history", text: "A parent, brother, or sister with diabetes." },
      { icon: "🤰", title: "Diabetes in pregnancy", text: "Women who had high sugar during pregnancy are at higher risk later." },
    ],
  },
  prevention: [
    { title: "Move every day", text: "Walk briskly for 30 minutes on at least 5 days a week. Climbing stairs, farming, and housework count too." },
    { title: "Watch your waist", text: "Aim for a waist under 90 cm (35 inches) for men and under 80 cm (31 inches) for women." },
    { title: "Fill half your plate with vegetables", text: "Eat smaller portions of rice, and choose whole grains, dal, and vegetables more often." },
    { title: "Cut down on sugar", text: "Avoid soft drinks and packaged juices. Have less sugar in tea." },
    { title: "Get your sugar tested", text: "Adults over 30 should have a blood sugar test. It is available free at government health centres." },
  ],
  tool: {
    href: "/tools/diabetes-risk",
    title: "Diabetes Risk Check",
    text: "Answer 4 quick questions to see your risk.",
  },
  help: {
    urgent: [
      "Confusion, fainting, or very drowsy (in someone with diabetes)",
      "Very fast breathing, vomiting, and stomach pain with high sugar",
      "Shaking, sweating, and confusion — signs of very low sugar (give sugar or a sweet drink if they can swallow)",
    ],
    soon: [
      "Any of the warning signs above",
      "A foot wound that is not healing, or looks red or swollen",
      "Sudden change in vision",
    ],
    routine: [
      "Adults over 30: blood sugar test at least once every few years",
      "If you have diabetes: regular check-ups, plus yearly eye, kidney, and foot checks",
      "If your Diabetes Risk Check shows moderate or high risk",
    ],
  },
  myths: [
    { myth: "Only people who eat a lot of sugar get diabetes.", fact: "Diabetes is caused by many things, including weight, inactivity, age, and family history." },
    { myth: "Only older people get diabetes.", fact: "Type 2 diabetes is increasingly found in young adults and even children." },
    { myth: "People with diabetes can never eat sweets.", fact: "Small amounts can fit into a balanced diet. A doctor or dietitian can help you plan." },
    { myth: "Once you start insulin, you can never stop.", fact: "Insulin is a safe, natural hormone. Your doctor decides the best treatment for you." },
  ],
  faqs: [
    { q: "What is prediabetes?", a: "Prediabetes means your blood sugar is higher than normal but not high enough to be diabetes. It is a warning sign — with more activity and healthier food, many people can return to normal sugar levels." },
    { q: "Where can I get a sugar test?", a: "Government hospitals, Primary Health Centres, and Health & Wellness Centres offer blood sugar tests, usually free for adults over 30 under the national programme." },
    { q: "Can diabetes be cured?", a: "Type 2 diabetes usually cannot be cured, but it can be controlled very well. Some people can bring their sugar to normal with weight loss and lifestyle changes." },
    { q: "Why are feet so important in diabetes?", a: "Diabetes can reduce feeling and blood flow in the feet, so small wounds can become serious. Check your feet daily and see a doctor about any wound that is not healing." },
  ],
  sources: [
    { label: "ICMR-INDIAB study (Anjana RM et al.), The Lancet Diabetes & Endocrinology, 2023" },
    { label: "World Health Organization — Diabetes fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/diabetes" },
    { label: "Indian Diabetes Risk Score — Madras Diabetes Research Foundation (Mohan V et al., 2005)" },
  ],
  related: ["/heart", "/cancer"],
};
