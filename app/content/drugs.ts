import type { TopicContent } from "./types";

export const drugs: TopicContent = {
  slug: "/drugs",
  icon: "🚫",
  title: "Alcohol & Drug Use",
  intro:
    "Alcohol and drug problems affect many families in Mizoram. Addiction is a health condition, and recovery is possible. Learn the signs, how to help, and what to do in an overdose.",
  readingTime: "5 minute",
  facts: [
    { value: "2.6 million", label: "deaths every year worldwide are caused by alcohol", source: "World Health Organization, 2024" },
    { value: "Treatable", label: "Addiction is a health condition that can be treated", source: "World Health Organization" },
    { value: "14416", label: "Tele-MANAS: free, confidential support 24 hours a day", source: "Ministry of Health & Family Welfare" },
  ],
  overview: [
    "Alcohol and drugs like heroin change how the brain works. Over time, a person may need more to feel the same effect and feel sick without it. This is addiction (dependence), and it is not simply a lack of willpower.",
    "Drug and alcohol use harms the liver, heart, and brain, and causes accidents, violence, and money problems. Injecting drugs with shared needles spreads HIV and hepatitis C.",
    "Recovery is possible. Counselling, medical treatment, support groups, and the support of family and church help many people stop and rebuild their lives.",
  ],
  local: {
    title: "In Mizoram",
    text: "Heroin and other injected drugs are a serious problem in Mizoram and are linked to the state's high HIV rate. Government hospitals, de-addiction centres, and community and church groups offer support. Tele-MANAS (14416) can guide you to services.",
  },
  signsTitle: "Signs of a problem",
  signs: [
    { icon: "🔁", text: "Needing more to get the same effect" },
    { icon: "🤢", text: "Feeling sick, shaky, or restless without it" },
    { icon: "🚫", text: "Trying to stop but not being able to" },
    { icon: "💼", text: "Missing work, school, or family duties" },
    { icon: "💸", text: "Money problems or stealing" },
    { icon: "🫥", text: "Hiding use or lying about it" },
  ],
  signsNote:
    "If you see these signs in yourself or someone you love, it is not too early to ask for help.",
  risks: {
    changeable: [
      { icon: "👥", title: "Friends who use", text: "Peer pressure, especially among young people." },
      { icon: "😔", title: "Using to cope with stress or sadness", text: "Can quickly turn into dependence." },
      { icon: "🧒", title: "Starting young", text: "The earlier someone starts, the higher the risk of addiction." },
    ],
    fixed: [
      { icon: "👨‍👩‍👧", title: "Family history", text: "Addiction can run in families." },
      { icon: "💔", title: "Trauma or difficult childhood", text: "Raises the risk of substance use." },
    ],
  },
  prevention: [
    { title: "Talk openly with young people", text: "Children who can talk to their parents about drugs are less likely to use them." },
    { title: "Find other ways to cope", text: "Sports, music, church, and community activities help with stress and boredom." },
    { title: "Never share needles", text: "If someone injects drugs, a new sterile needle each time prevents HIV and hepatitis." },
    { title: "Don't use alone", text: "If someone uses drugs, having another person present can save their life in an overdose." },
    { title: "Ask for help early", text: "Call Tele-MANAS on 14416 or visit a government hospital. Treatment is confidential." },
  ],
  help: {
    urgent: [
      "Overdose: the person cannot be woken, is breathing very slowly or not at all, or has blue lips — call 108 immediately",
      "Fits or severe confusion after stopping alcohol",
      "Thoughts of suicide — call 14416 or 112",
    ],
    soon: [
      "Unable to stop or cut down",
      "Shaking, sweating, or vomiting when not using",
      "Injecting drugs, or sharing needles in the past (get tested for HIV and hepatitis)",
    ],
    routine: [
      "Talk to a doctor or counsellor if you are worried about your drinking or drug use",
      "Family members can also get support — you do not have to cope alone",
    ],
  },
  myths: [
    { myth: "Addiction is a choice — people can just stop.", fact: "Addiction changes the brain. Most people need support and treatment to recover." },
    { myth: "Only weak people get addicted.", fact: "Addiction can happen to anyone, from any family." },
    { myth: "Suddenly stopping alcohol is always safe.", fact: "For heavy drinkers, stopping suddenly can cause fits. Ask a doctor for safe help." },
    { myth: "Recovery is impossible.", fact: "Many people recover and live full lives with the right support." },
  ],
  faqs: [
    { q: "What should I do if someone has overdosed?", a: "Call 108 immediately. Try to wake them. If they are breathing, turn them on their side so they do not choke. Stay with them until help arrives." },
    { q: "How can I help a family member?", a: "Talk calmly when they are sober, avoid blaming, and encourage them to see a doctor or call 14416. Look after yourself too — family support groups can help." },
    { q: "Is treatment confidential?", a: "Yes. Doctors and Tele-MANAS counsellors keep your information private." },
  ],
  sources: [
    { label: "World Health Organization — Alcohol fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/alcohol" },
    { label: "World Health Organization — Opioid overdose fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/opioid-overdose" },
    { label: "Tele-MANAS, Ministry of Health & Family Welfare", href: "https://telemanas.mohfw.gov.in" },
  ],
  related: ["/mental", "/hiv"],
};
