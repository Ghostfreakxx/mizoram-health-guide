import type { TopicContent } from "./types";

export const tb: TopicContent = {
  slug: "/tb",
  icon: "🫁",
  title: "Tuberculosis (TB)",
  intro:
    "TB is a serious infection, but it can be cured with free treatment. A cough lasting more than 2 weeks should always be tested.",
  readingTime: "4 minute",
  facts: [
    { value: "#1", label: "India has the highest number of TB cases in the world", source: "WHO Global Tuberculosis Report" },
    { value: "2 weeks", label: "A cough lasting this long should be tested for TB", source: "National TB Elimination Programme" },
    { value: "Free", label: "TB tests, medicines, and nutrition support for patients", source: "National TB Elimination Programme" },
  ],
  overview: [
    "Tuberculosis (TB) is caused by germs that usually attack the lungs, but can affect any part of the body. It spreads through the air when a person with TB of the lungs coughs, sneezes, or talks.",
    "Not everyone who breathes in TB germs becomes sick. But people with weak defences — such as those with HIV, diabetes, poor nutrition, or who smoke — are more likely to get sick.",
    "TB can be cured. Treatment usually takes at least 6 months. It is very important to take every dose and finish the full course, even after you feel better. Stopping early can cause drug-resistant TB, which is much harder to treat.",
  ],
  signsTitle: "Signs of TB",
  signs: [
    { icon: "😷", text: "Cough lasting more than 2 weeks" },
    { icon: "🩸", text: "Coughing up blood or phlegm" },
    { icon: "🌡️", text: "Fever, especially in the evening" },
    { icon: "💦", text: "Night sweats" },
    { icon: "⚖️", text: "Weight loss and loss of appetite" },
    { icon: "💔", text: "Chest pain or breathlessness" },
  ],
  signsNote:
    "TB can also affect glands, bones, and other organs. Long-lasting fever and weight loss should always be checked.",
  risks: {
    changeable: [
      { icon: "🚬", title: "Smoking", text: "Damages the lungs and raises the risk of TB." },
      { icon: "🍺", title: "Alcohol and drug use", text: "Weakens the body's defences." },
      { icon: "🍚", title: "Poor nutrition", text: "Being underweight makes TB more likely." },
      { icon: "🪟", title: "Crowded, poorly ventilated rooms", text: "TB germs stay in the air longer." },
    ],
    fixed: [
      { icon: "🛡️", title: "HIV", text: "People with HIV are many times more likely to get TB." },
      { icon: "🩸", title: "Diabetes", text: "Raises the risk of TB and makes it harder to treat." },
      { icon: "🏠", title: "Living with someone who has TB", text: "Household members should be checked." },
    ],
  },
  prevention: [
    { title: "Get tested early", text: "If you have a cough for more than 2 weeks, get tested at a government health centre. The test is free." },
    { title: "Finish your treatment", text: "Take every dose for the full course. Never stop because you feel better." },
    { title: "Cover coughs and sneezes", text: "Use a cloth or your elbow. People with TB should wear a mask in the first weeks of treatment." },
    { title: "Let fresh air in", text: "Open windows. Sunlight and ventilation reduce TB germs in a room." },
    { title: "Eat well", text: "Good nutrition helps the body fight TB. TB patients can receive nutrition support from the government." },
    { title: "Protect babies", text: "The BCG vaccine, given at birth, protects young children from severe forms of TB." },
  ],
  help: {
    urgent: [
      "Coughing up a large amount of blood",
      "Severe breathlessness",
    ],
    soon: [
      "Cough lasting more than 2 weeks",
      "Fever, night sweats, and weight loss",
      "Someone in your home has TB and you have any symptoms",
    ],
    routine: [
      "People with HIV or diabetes: ask about TB screening at check-ups",
      "TB patients: regular follow-up during treatment",
    ],
  },
  myths: [
    { myth: "TB cannot be cured.", fact: "TB can be fully cured with the right medicines taken for the full course." },
    { myth: "TB is passed down in families.", fact: "TB is an infection spread through the air, not inherited." },
    { myth: "You can get TB from sharing plates or shaking hands.", fact: "TB spreads through the air from coughs, not through touch or food." },
    { myth: "I can stop treatment once I feel better.", fact: "Stopping early can bring TB back in a form that is much harder to treat." },
  ],
  faqs: [
    { q: "Is TB treatment really free?", a: "Yes. Under the National TB Elimination Programme, tests and medicines are free at government health facilities. Patients may also receive money for nutrition support." },
    { q: "Can I go to work during treatment?", a: "Most people with TB of the lungs stop being infectious after a few weeks of correct treatment. Your doctor will tell you when it is safe to return." },
    { q: "Who should I call for help?", a: "Call the Ni-kshay Sampark TB helpline on 1800-11-6666 (free) for information about testing and treatment." },
  ],
  sources: [
    { label: "World Health Organization — Global Tuberculosis Report", href: "https://www.who.int/teams/global-tuberculosis-programme/tb-reports" },
    { label: "National TB Elimination Programme, Ministry of Health & Family Welfare", href: "https://tbcindia.mohfw.gov.in" },
  ],
  related: ["/hiv", "/tobacco"],
};
