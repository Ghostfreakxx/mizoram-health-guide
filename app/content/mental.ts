import type { TopicContent } from "./types";

export const mental: TopicContent = {
  slug: "/mental",
  icon: "🧠",
  title: "Mental Wellbeing",
  intro:
    "Mental health is part of everyday health. Stress, sadness, worry, and addiction are common, real, and treatable. Asking for help is a sign of strength.",
  readingTime: "5 minute",
  facts: [
    { value: "1 in 8", label: "people worldwide live with a mental health condition", source: "World Health Organization" },
    { value: "Half", label: "of all mental health conditions begin by age 14", source: "World Health Organization" },
    { value: "14416", label: "Tele-MANAS: free, confidential mental health support, 24 hours a day", source: "Ministry of Health & Family Welfare" },
  ],
  overview: [
    "Mental health is how we think, feel, and cope with daily life. Everyone has hard days. But when sadness, worry, or stress lasts for weeks and makes it hard to work, study, or care for yourself, it may be a mental health condition.",
    "Common conditions include depression, anxiety, and problems with alcohol or drugs. They can happen to anyone — young or old, rich or poor. They are not a sign of weakness or a lack of faith.",
    "Mental health conditions can be treated. Talking therapy, support from family and community, and sometimes medicine help most people feel better.",
  ],
  local: {
    title: "Support in Mizoram",
    text: "Substance use is a serious concern in Mizoram, and many families are affected. Tele-MANAS (14416) offers free, confidential support by phone. Your nearest government hospital can also connect you with a counsellor, psychiatrist, or de-addiction services.",
  },
  signsTitle: "Signs you may need support",
  signs: [
    { icon: "😔", text: "Feeling sad, empty, or hopeless most days" },
    { icon: "🎯", text: "Losing interest in things you used to enjoy" },
    { icon: "😴", text: "Sleeping too much or too little" },
    { icon: "😰", text: "Constant worry, fear, or panic" },
    { icon: "🍽️", text: "Big changes in appetite or weight" },
    { icon: "🫥", text: "Pulling away from family and friends" },
    { icon: "🍺", text: "Using alcohol or drugs to cope" },
    { icon: "💭", text: "Thoughts of harming yourself" },
  ],
  signsNote:
    "If these feelings last more than 2 weeks, talk to someone. If you have thoughts of harming yourself, call Tele-MANAS on 14416 or 112 right now.",
  risks: {
    changeable: [
      { icon: "🍺", title: "Alcohol and drug use", text: "Can cause and worsen depression and anxiety." },
      { icon: "🫥", title: "Isolation", text: "Being alone for long periods without support." },
      { icon: "😴", title: "Poor sleep", text: "Lack of sleep affects mood and coping." },
      { icon: "📱", title: "Too much screen time", text: "Especially late at night and on social media." },
    ],
    fixed: [
      { icon: "💔", title: "Difficult life events", text: "Loss, abuse, money problems, or illness." },
      { icon: "👨‍👩‍👧", title: "Family history", text: "Mental health conditions can run in families." },
      { icon: "🤱", title: "After childbirth", text: "Some mothers experience depression after having a baby." },
    ],
  },
  prevention: [
    { title: "Talk to someone you trust", text: "A family member, friend, church elder, teacher, or counsellor. Sharing a problem makes it lighter." },
    { title: "Stay connected", text: "Spend time with people. Join community, church, or youth activities." },
    { title: "Move your body", text: "Even a short daily walk can improve your mood and sleep." },
    { title: "Keep a sleep routine", text: "Go to bed and wake up at the same time. Put your phone away an hour before sleep." },
    { title: "Avoid alcohol and drugs", text: "They may seem to help for a short time, but they make problems worse." },
    { title: "Ask for help early", text: "Call Tele-MANAS on 14416 for free advice. You do not need to wait until things get very bad." },
  ],
  help: {
    urgent: [
      "Thoughts of suicide or harming yourself — call 14416 or 112 now",
      "Someone has harmed themselves or taken an overdose — call 108",
      "Seeing or hearing things that are not there, with confusion or danger",
    ],
    soon: [
      "Sadness, worry, or poor sleep lasting more than 2 weeks",
      "Not able to work, study, or look after yourself",
      "Needing alcohol or drugs to get through the day",
    ],
    routine: [
      "Talk to a doctor or counsellor if you are going through a hard time",
      "New mothers: share how you are feeling at your check-ups",
      "Check in on friends and family members who seem withdrawn",
    ],
  },
  myths: [
    { myth: "Depression is a sign of a weak mind.", fact: "Depression is a health condition, like diabetes. It can affect anyone." },
    { myth: "Talking about suicide puts the idea in someone's head.", fact: "Asking someone directly and kindly can save their life. It shows you care." },
    { myth: "Addiction is a choice — people can just stop.", fact: "Addiction changes the brain. Most people need support and treatment to recover." },
    { myth: "Young people don't have real problems.", fact: "Half of mental health conditions start by age 14. Young people need support too." },
  ],
  faqs: [
    { q: "What is Tele-MANAS?", a: "Tele-MANAS is a free mental health helpline run by the Government of India. Call 14416 any time, day or night, to talk confidentially with a trained counsellor." },
    { q: "How can I help a friend who seems depressed?", a: "Listen without judging, tell them you care, and encourage them to get help. Offer to go with them to a doctor or call 14416 together. If they talk about suicide, do not leave them alone — get help immediately." },
    { q: "Will people find out if I get help?", a: "Your conversations with Tele-MANAS and with doctors are confidential." },
    { q: "Is medicine for mental health addictive?", a: "Most medicines used for depression and anxiety are not addictive. A doctor will explain how they work and how long to take them." },
  ],
  sources: [
    { label: "World Health Organization — Mental disorders fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/mental-disorders" },
    { label: "World Health Organization — Adolescent mental health fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health" },
    { label: "Tele-MANAS, Ministry of Health & Family Welfare", href: "https://telemanas.mohfw.gov.in" },
  ],
  related: ["/tobacco", "/heart"],
};
