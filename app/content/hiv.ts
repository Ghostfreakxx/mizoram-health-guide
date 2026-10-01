import type { TopicContent } from "./types";

export const hiv: TopicContent = {
  slug: "/hiv",
  icon: "🛡️",
  title: "HIV & AIDS",
  intro:
    "HIV can be prevented, and with free treatment people with HIV can live long, healthy lives. Learn how it spreads, how it does not, and where to get a free test.",
  readingTime: "5 minute",
  facts: [
    { value: "Highest", label: "HIV prevalence among all Indian states is in Mizoram", source: "National AIDS Control Organisation (NACO), India HIV Estimates" },
    { value: "Free", label: "HIV testing, counselling, and lifelong treatment at government centres", source: "National AIDS Control Programme" },
    { value: "1097", label: "National AIDS Helpline — free and confidential", source: "NACO" },
  ],
  overview: [
    "HIV (human immunodeficiency virus) attacks the body's defence system. Without treatment, it slowly weakens the body until it cannot fight infections. This late stage is called AIDS.",
    "Many people with HIV feel healthy for years and do not know they have it. The only way to know is to get tested.",
    "There is no cure yet, but medicine called ART (antiretroviral therapy) keeps HIV under control. People who take ART every day can live a normal lifespan. When the virus is kept very low (undetectable), they do not pass HIV to their partners through sex.",
  ],
  local: {
    title: "Why this matters in Mizoram",
    text: "Mizoram has the highest rate of HIV among Indian states. Sharing needles while injecting drugs and unprotected sex are the main ways it spreads here. Free testing is available at every district hospital, and free ART treatment is available in the state.",
  },
  signsTitle: "Signs and symptoms",
  signs: [
    { icon: "🤒", text: "Flu-like illness 2–4 weeks after infection (fever, sore throat, rash)" },
    { icon: "😶", text: "Often no symptoms at all for many years" },
    { icon: "⚖️", text: "Later: losing weight without trying" },
    { icon: "🌡️", text: "Later: fever or night sweats that keep coming back" },
    { icon: "🚽", text: "Later: diarrhoea lasting more than a month" },
    { icon: "😮‍💨", text: "Later: frequent infections, including TB" },
  ],
  signsNote:
    "You cannot tell if someone has HIV by looking at them. If you may have been exposed, get tested — even if you feel fine.",
  risks: {
    changeable: [
      { icon: "💉", title: "Sharing needles or syringes", text: "The biggest risk in Mizoram. Always use a new, sterile needle." },
      { icon: "❤️", title: "Sex without a condom", text: "Especially with more than one partner." },
      { icon: "🧪", title: "Not knowing your status", text: "Testing lets you start treatment early and protect others." },
      { icon: "🦠", title: "Other sexually transmitted infections", text: "These increase the risk of HIV. Get them treated." },
    ],
    fixed: [
      { icon: "🤰", title: "Mother to baby", text: "Without treatment, HIV can pass during pregnancy, birth, or breastfeeding." },
      { icon: "👨‍👩‍👧", title: "A partner with HIV", text: "Your partner's treatment and condom use protect you." },
    ],
  },
  prevention: [
    { title: "Never share needles", text: "Use a new sterile needle and syringe every time. Needle and syringe programmes and de-addiction services can help." },
    { title: "Use a condom every time", text: "Condoms are available free at government health centres." },
    { title: "Get tested", text: "Testing is free and confidential at Integrated Counselling and Testing Centres (ICTCs) in government hospitals." },
    { title: "Start treatment early", text: "If you test positive, start ART as soon as possible. Take it every day." },
    { title: "Every pregnant woman should be tested", text: "With treatment, the chance of passing HIV to the baby becomes very small." },
  ],
  help: {
    urgent: [
      "You may have been exposed in the last 72 hours (unsafe sex, needle-stick, sharing needles) — go to a hospital immediately and ask about PEP, emergency medicine that can prevent HIV",
    ],
    soon: [
      "You have ever shared needles or had unprotected sex with a partner whose status you do not know",
      "You have symptoms of a sexually transmitted infection",
      "You are pregnant or planning a pregnancy and have not been tested",
    ],
    routine: [
      "People who inject drugs or have more than one partner: test at least once a year",
      "People living with HIV: regular check-ups and viral load tests at the ART centre",
    ],
  },
  myths: [
    { myth: "You can get HIV from hugging, sharing food, or using the same toilet.", fact: "HIV does not spread through everyday contact, food, water, or mosquito bites." },
    { myth: "HIV is a death sentence.", fact: "With free daily treatment, people with HIV can live long, healthy lives." },
    { myth: "Only certain kinds of people get HIV.", fact: "Anyone can get HIV. It depends on what a person does, not who they are." },
    { myth: "A mother with HIV will always pass it to her baby.", fact: "With treatment, most babies of mothers with HIV are born free of HIV." },
  ],
  faqs: [
    { q: "Where can I get tested?", a: "At any Integrated Counselling and Testing Centre (ICTC) in government hospitals. The test is free, quick, and confidential. You can also call 1097 for guidance." },
    { q: "Will people know my result?", a: "No. HIV testing and treatment are confidential. The law (HIV and AIDS Act, 2017) also protects people with HIV from discrimination." },
    { q: "What is PEP?", a: "PEP (post-exposure prophylaxis) is a short course of medicine taken after a possible exposure to HIV. It must be started within 72 hours — the sooner the better. Ask at a government hospital." },
    { q: "How long after exposure should I test?", a: "Some tests can detect HIV a few weeks after exposure, but a counsellor may ask you to test again after 3 months to be sure." },
  ],
  sources: [
    { label: "National AIDS Control Organisation (NACO), Ministry of Health & Family Welfare", href: "https://naco.gov.in" },
    { label: "World Health Organization — HIV and AIDS fact sheet", href: "https://www.who.int/news-room/fact-sheets/detail/hiv-aids" },
    { label: "Mizoram State AIDS Control Society" },
  ],
  related: ["/drugs", "/tb"],
};
