// Built-in answers for the Health Assistant. No external API is used:
// the user's question is matched against keywords and the best answer is shown.

export type Answer = {
  text: string;
  link?: { href: string; label: string };
};

type Entry = Answer & {
  keywords: string[];
  // Urgent entries win over everything else when any keyword matches.
  urgent?: boolean;
};

const entries: Entry[] = [
  // Emergencies first
  {
    urgent: true,
    keywords: [
      "chest pain", "heart attack", "cannot breathe", "can't breathe", "cant breathe",
      "not breathing", "breathing difficulty", "unconscious", "fainted", "fainting",
      "severe bleeding", "stroke", "face drooping", "seizure",
    ],
    text: "This may be an emergency. Call 108 for an ambulance now, or go to the nearest hospital immediately. Do not wait to see if it gets better.",
    link: { href: "/hospitals", label: "Hospital & help directory" },
  },
  {
    urgent: true,
    keywords: [
      "suicide", "kill myself", "end my life", "want to die", "self harm",
      "self-harm", "hurt myself", "no reason to live",
    ],
    text: "I am sorry you are feeling this way. You are not alone, and help is available. Please call Tele-MANAS on 14416 (free, 24 hours) to talk to a trained counsellor. If you are in immediate danger, call 112. Please also tell someone you trust right now.",
    link: { href: "/mental", label: "Mental wellbeing" },
  },

  // Medicine requests
  {
    keywords: ["medicine", "tablet", "dose", "dosage", "prescribe", "prescription", "antibiotic", "painkiller"],
    text: "I cannot suggest medicines or doses. Taking the wrong medicine can be harmful. Please ask a doctor or pharmacist, who can check what is right for you.",
  },

  // Cancer
  {
    keywords: ["oral cancer", "mouth cancer", "mouth ulcer", "white patch", "red patch", "mouth wound", "mouth sore"],
    text: "Early signs of oral (mouth) cancer can include a mouth ulcer that does not heal, white or red patches inside the mouth, a lump in the mouth or neck, and pain while chewing or swallowing. If any of these last more than 2–3 weeks, please visit a doctor. Tobacco and betel nut greatly increase the risk.",
    link: { href: "/tobacco", label: "Tobacco & oral health" },
  },
  {
    keywords: ["reduce cancer", "prevent cancer", "cancer risk", "avoid cancer", "cancer prevention"],
    text: "You can lower your cancer risk by not using tobacco or betel nut, limiting alcohol, eating more vegetables and fruit, staying active, keeping a healthy weight, and going for regular check-ups. Finding cancer early makes treatment more successful.",
    link: { href: "/cancer", label: "Cancer awareness" },
  },
  {
    keywords: ["cancer", "lump", "tumour", "tumor", "unusual bleeding", "weight loss"],
    text: "Some warning signs of cancer include a wound that does not heal, unusual bleeding, a lump, a long-lasting cough, difficulty swallowing, or weight loss without reason. These do not always mean cancer, but it is safer to visit a doctor early.",
    link: { href: "/cancer", label: "Cancer awareness" },
  },

  // Tobacco, betel nut, alcohol
  {
    keywords: ["quit", "stop smoking", "give up smoking", "stop tobacco", "leave tobacco"],
    text: "Quitting tobacco is one of the best things you can do for your health. Set a quit date, remove tobacco from your home, avoid triggers, and ask family for support. Call the free National Tobacco Quitline on 1800-11-2356 for help.",
    link: { href: "/tobacco", label: "Tobacco & oral health" },
  },
  {
    keywords: ["smoking", "smoke", "cigarette", "bidi", "tobacco", "khaini", "nicotine"],
    text: "Smoking and tobacco increase the risk of mouth, throat and lung cancer, heart attack, stroke, and breathing problems. There is no safe amount. If you want to quit, call the free National Tobacco Quitline on 1800-11-2356.",
    link: { href: "/tobacco", label: "Tobacco & oral health" },
  },
  {
    keywords: ["betel", "kuhva", "paan", "pan masala", "gutkha", "areca", "supari"],
    text: "Betel nut (kuhva), even without tobacco, can cause mouth cancer and gum disease. Adding tobacco makes the risk much higher. Watch for mouth ulcers, white or red patches, or stiffness when opening the mouth, and see a doctor if they last more than 2–3 weeks.",
    link: { href: "/tobacco", label: "Tobacco & oral health" },
  },
  {
    keywords: ["alcohol", "drinking", "drunk", "liquor", "beer", "zu"],
    text: "Alcohol can harm the liver, heart, and brain, and increases the risk of several cancers. Less is better. If you find it hard to control your drinking, talk to a doctor or call Tele-MANAS on 14416 for support.",
  },

  // Diabetes
  {
    keywords: ["diabetes", "sugar", "blood sugar", "glucose", "diabetic"],
    text: "Common signs of diabetes include frequent urination, too much thirst, tiredness, slow wound healing, blurred vision, and weight changes. A simple blood sugar test can confirm it. Regular walking, balanced food, and fewer sugary drinks help lower the risk.",
    link: { href: "/diabetes", label: "Diabetes awareness" },
  },

  // Heart
  {
    keywords: ["blood pressure", "bp", "hypertension", "high pressure"],
    text: "High blood pressure often has no symptoms, so check it regularly. It can be caused or made worse by too much salt, smoking, alcohol, stress, being overweight, and lack of exercise. Eating less salt, staying active, and not smoking help keep it under control.",
    link: { href: "/heart", label: "Heart health" },
  },
  {
    keywords: ["heart", "cholesterol", "palpitation", "heartbeat"],
    text: "Warning signs of heart problems include chest pain or tightness, shortness of breath, pain spreading to the arm, neck or jaw, sudden sweating, and fainting. These can be urgent — call 108. To protect your heart: do not smoke, eat less salt and fried food, stay active, and check your blood pressure.",
    link: { href: "/heart", label: "Heart health" },
  },

  // Lifestyle
  {
    keywords: ["exercise", "walk", "walking", "physical activity", "workout", "fitness", "active"],
    text: "Adults should aim for at least 150 minutes of moderate activity each week — for example, a brisk 30-minute walk on 5 days. Any movement is better than none. Start slowly and increase over time.",
  },
  {
    keywords: ["diet", "food", "nutrition", "eat", "eating", "salt", "vegetable", "fruit", "weight"],
    text: "A healthy diet includes plenty of vegetables, fruit, and whole grains, with less salt, sugar, and fried or processed food. Drink enough water and limit sugary drinks. Smaller portions help keep a healthy weight.",
  },

  // Mental wellbeing
  {
    keywords: ["depression", "depressed", "sad", "hopeless", "lonely", "alone"],
    text: "Feeling sad or hopeless for many days, losing interest in daily life, or feeling alone can be signs of depression. It is a real health problem and it can be treated. Talk to someone you trust, and call Tele-MANAS on 14416 (free) or see a doctor for support.",
    link: { href: "/mental", label: "Mental wellbeing" },
  },
  {
    keywords: ["stress", "anxiety", "anxious", "worried", "worry", "panic", "tension", "fear"],
    text: "Some stress is normal, but too much can affect your sleep, body, and mood. Try slow breathing, regular exercise, enough sleep, and talking to someone you trust. If it does not improve, call Tele-MANAS on 14416 (free) or speak to a doctor.",
    link: { href: "/mental", label: "Mental wellbeing" },
  },
  {
    keywords: ["sleep", "insomnia", "can't sleep", "cannot sleep"],
    text: "Adults need about 7–9 hours of sleep. Keep a regular sleep time, avoid screens and tea or coffee late in the evening, and keep your room dark and quiet. If poor sleep continues for weeks, see a doctor.",
    link: { href: "/mental", label: "Mental wellbeing" },
  },
  {
    keywords: ["drug", "drugs", "addiction", "addicted", "heroin", "substance"],
    text: "Addiction is a health condition, and recovery is possible with support. Please speak to a doctor or call Tele-MANAS on 14416 (free, 24 hours) for confidential help. Family support makes a big difference.",
    link: { href: "/mental", label: "Mental wellbeing" },
  },

  // Getting help
  {
    keywords: ["doctor", "hospital", "when should i", "check-up", "checkup", "clinic"],
    text: "Visit a doctor if symptoms last more than a few days, get worse, or worry you. Go urgently (or call 108) for chest pain, breathing difficulty, fainting, severe bleeding, or sudden weakness. Regular check-ups help find problems early.",
    link: { href: "/hospitals", label: "Hospital & help directory" },
  },
  {
    keywords: ["helpline", "phone number", "contact", "emergency number", "ambulance"],
    text: "Useful numbers: Ambulance 108 · National emergency 112 · Tele-MANAS mental health 14416 · National Tobacco Quitline 1800-11-2356.",
    link: { href: "/hospitals", label: "Hospital & help directory" },
  },

  // Small talk
  {
    keywords: ["thank", "thanks", "ka lawm"],
    text: "You are welcome. Stay healthy, and visit a doctor whenever you are unsure.",
  },
  {
    keywords: ["hello", "hi", "hey", "chibai"],
    text: "Hello! Ask me about cancer, tobacco, diabetes, heart health, mental wellbeing, diet, or exercise.",
  },
];

const fallback: Answer = {
  text: "Sorry, I don't have an answer for that yet. I can help with cancer, tobacco and betel nut, diabetes, heart health, mental wellbeing, diet, and exercise. For anything about your own symptoms, please see a doctor.",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(question: string, keyword: string) {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(question);
}

export function findAnswer(question: string): Answer {
  const q = question.toLowerCase().replace(/[’‘]/g, "'");

  let best: Entry | undefined;
  let bestScore = 0;

  for (const entry of entries) {
    // Longer, more specific phrases count for more than single words.
    const score = entry.keywords
      .filter((k) => matches(q, k))
      .reduce((sum, k) => sum + k.split(" ").length, 0);

    if (score === 0) continue;
    if (entry.urgent) return entry;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return best ?? fallback;
}
