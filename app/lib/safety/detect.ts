// Detects RED (emergency) conditions in free text.
//
// Design rules:
// - Reassuring words elsewhere in a message ("but I feel okay", "it isn't
//   much", "don't call anyone") never cancel a red flag.
// - A red flag directly negated ("no chest pain") is NOT treated as safe.
//   It becomes "needs confirmation", so the person is asked directly.
// - Some flags (suicide, infant, pregnancy, postpartum) are never treated as
//   negated, because the cost of missing them is too high.
// - Spelling mistakes are tolerated with a small edit-distance correction.

import type { RedFlagId } from "./redFlags";

type Pattern = {
  id: RedFlagId;
  match: RegExp[];
  // All of these must also appear somewhere in the message.
  context?: RegExp;
  negatable: boolean;
  // Words that may or may not mean an emergency ("breathing problem"):
  // never confirmed from the words alone, always asked about directly.
  ask?: boolean;
};

const PREGNANT = /\b(pregnan\w*|expecting a baby|weeks pregnant)\b/;
const POSTPARTUM = /\b(gave birth|given birth|delivered (a|my|her|the) baby|after (the )?(delivery|birth)|post ?partum|just had a baby|had (a|my|her) baby)\b/;
const FEVER = /\b(fever\w*|temperature|high temp|hot body)\b/;
const BABY = /\b(baby|babies|infant|newborn|new born|toddler|my (son|daughter) is [0-9]+ (months?|weeks?|days?))\b/;

const patterns: Pattern[] = [
  {
    id: "chest_pain",
    negatable: true,
    match: [
      /\bchest (pain|pains|pressure|tightness|hurts|hurting|ache|aching|discomfort)\b/,
      /\bchest (is|feels|feel|felt|was|getting|gets) (very |really |so |quite |a bit |a little |too )?(tight|heavy|painful|sore|squeezed|crushed)\b/,
      /\b(pain|pressure|tightness|ache) (in|on) (my |his |her |the )?chest\b/,
      /\bheart attack\b/,
      // Indian English: "my chest is paining", "paining in the chest".
      /\bchest (is |was |keeps |has been )?(paining|pains)\b|\bpaining (in|on) (my |his |her |the )?chest\b/,
    ],
  },
  {
    id: "stroke",
    negatable: true,
    match: [
      /\bstroke\b/,
      /\bface (is )?(drooping|droops|drooped|fallen|dropping)\b/,
      /\b(drooping|droopy) face\b/,
      /\bslurred (speech|words)\b|\bspeech (is )?slurred\b/,
      /\b(can'?t|cannot|unable to) (speak|talk) (properly|clearly)?\b/,
      /\b(sudden|suddenly) (weak|weakness|numb|numbness)\b/,
      /\b(weak|weakness|numb|numbness) (in|on) (one|the left|the right|left|right) (side|arm|leg)\b/,
      /\bone side (of (my|his|her|the) (body|face) )?(is |went |feels )?(weak|numb|not moving)\b/,
      /\b(worst|sudden severe|very severe sudden) headache\b/,
      // Same rule as the triage question "Sudden, very severe headache — the worst ever?" (nhs-stroke).
      /\bheadache\b( \w+){0,4} (worst|worse than ever|thunderclap)\b|\bthunderclap\b/,
    ],
  },
  {
    // Same rules as the triage questions fever-neck and head-neck (nhs-sepsis).
    id: "severe_infection",
    negatable: true,
    context: FEVER,
    match: [
      /\bstiff neck\b|\bneck (is |feels |was )?(stiff|rigid)\b/,
      /\brash (that )?(does ?n'?t|does not|won'?t|will not|is ?n'?t|is not) (fade|go away|disappear)\b/,
      /\b(very )?confused\b|\bconfusion\b|\bnot making sense\b/,
    ],
  },
  {
    // "Breathing problem" can mean an old condition or an emergency now: ask.
    id: "breathing",
    negatable: true,
    ask: true,
    match: [
      /\bbreathing (problem|problems|difficulty|trouble|issue|issues)\b/,
      /\b(short of breath|shortness of breath|breathless\w*|out of breath|breathlessness)\b/,
    ],
  },
  {
    // Same rule as the triage question stomach-blood (who-diarrhoea).
    id: "bleeding",
    negatable: true,
    ask: true,
    match: [/\b(black|tarry) (stools?|poo|potty|toilet)\b|\bblood in (my |his |her |the )?(stools?|poo|potty|toilet)\b|\bbloody stools?\b/],
  },
  {
    id: "breathing",
    negatable: true,
    match: [
      /\b(can'?t|cannot|cant|unable to|struggling to|hard to|difficult to|trouble|difficulty|problem) breath(e|ing)?\b/,
      /\b(not|stopped) breathing\b/,
      /\b(severe|very bad) (breathlessness|shortness of breath)\b/,
      /\bchoking\b|\bgasping\b/,
      /\b(lips?|face) (are |is |turning |went |turned )?blue\b|\bblue lips\b/,
    ],
  },
  {
    id: "unconscious",
    negatable: true,
    match: [
      /\bunconscious\b|\bunresponsive\b|\bpassed out\b|\bfainted\b|\bcollapsed\b/,
      /\b(won'?t|will not|wont|can'?t|cannot|cant|difficult to|hard to|not able to) (wake|be woken|woken)( up)?\b/,
      /\bnot waking( up)?\b/,
    ],
  },
  {
    id: "seizure",
    negatable: true,
    match: [
      /\bseizures?\b|\bconvuls\w*\b/,
      /\b(having|had|has|having a|had a|has a|having some) fits?\b/,
      /\bfitting\b/,
      /\bfits? (came|come|comes|coming|started|starting|happened|happening|attack)\b/,
      /\b(got|gets|getting|get) (a )?fits?\b|\bfit attack\b|\bepilep\w*( fit| attack)\b/,
    ],
  },
  {
    id: "bleeding",
    negatable: true,
    match: [
      /\b(heavy|heavily|severe|lots of|a lot of|uncontrolled|non ?stop|serious) bleeding\b/,
      /\bbleeding (heavily|a lot|badly|won'?t stop|will not stop|that won'?t stop|that will not stop|non ?stop|is not stopping|not stopping)\b/,
      /\bwon'?t stop bleeding\b/,
      /\b(vomit\w*|throwing up) blood\b/,
    ],
  },
  {
    id: "allergy",
    negatable: true,
    match: [
      /\b(swollen|swelling) (of )?(the |my |his |her )?(lips?|tongue|throat|mouth)\b/,
      /\b(lips?|tongue|throat) (is |are )?(swollen|swelling|closing)\b/,
      /\banaphyla\w*\b|\bsevere allergic\b|\ballergic reaction\b/,
    ],
  },
  {
    id: "overdose",
    negatable: false,
    match: [
      /\boverdos\w*\b|\bo\.?d\.?'?d\b/,
      /\btoo many (\w+ ){0,2}(pills|tablets|medicines?|capsules)\b/,
      /\b(took|taken|swallowed|ate) (too much|a lot of|lots of|all (of )?(my|the|his|her|their)|a (whole|full) (bottle|strip|packet) of) (\w+ ){0,2}(medicine|medicines|pills|tablets|drugs?|capsules)\b/,
    ],
  },
  {
    id: "poisoning",
    negatable: true,
    match: [/\bpoison\w*\b/, /\b(drank|swallowed|ate) (pesticide|kerosene|bleach|acid|insecticide|rat poison|chemicals?)\b/],
  },
  {
    id: "snakebite",
    negatable: true,
    match: [/\bsnake ?bites?\b|\bsnake ?bitten\b|\bbitten by a snake\b|\bsnake bit\b/],
  },
  {
    id: "injury",
    negatable: true,
    match: [
      /\b(serious|bad|severe|major|big) (accident|injury|burns?|fall)\b/,
      /\b(car|road|bike|motorbike|vehicle) accident\b/,
      /\bhead injury\b|\bhit (my|his|her|their) head\b/,
      /\bfell from (a |the )?(height|roof|tree|building)\b/,
    ],
  },
  {
    id: "suicide",
    negatable: false,
    match: [
      /\bsuicid\w*\b/,
      /\bkill (my ?self|him ?self|her ?self|them ?selves)\b/,
      /\bend (my|his|her) (own )?life\b/,
      /\b(want|wants|wanted|going) to die\b|\bwanna die\b/,
      /\bdon'?t want to (live|be alive|wake up)\b/,
      /\b(hurt|hurting|harm|harming|cut|cutting) (my ?self|him ?self|her ?self)\b/,
      /\bself.?harm\w*\b/,
      /\bno reason to live\b|\bbetter off dead\b/,
    ],
  },
  {
    id: "pregnancy",
    negatable: false,
    context: PREGNANT,
    match: [
      /\bbleed\w*\b|\bspotting\b/,
      /\bfits?\b|\bseizures?\b|\bconvuls\w*\b/,
      /\b(severe|bad|very bad|terrible) headache\b|\bblurred vision\b|\bblurry vision\b/,
      /\bwaters? (has |have )?(broke|broken|breaking)\b/,
      /\bbaby (is )?(not moving|moving less|stopped moving|isn'?t moving)\b|\bless (movement|moving)\b|\bnot feeling the baby move\b/,
      /\bswelling (of|in) (my |her )?(face|hands)\b|\b(face|hands) (are |is )?swollen\b/,
    ],
  },
  {
    id: "postpartum",
    negatable: false,
    context: POSTPARTUM,
    match: [
      /\b(heavy|a lot of|lots of) bleeding\b|\bbleeding (heavily|a lot)\b/,
      /\bfits?\b|\bseizures?\b|\bconvuls\w*\b/,
      /\b(severe|bad) headache\b|\bblurred vision\b/,
      /\b(can'?t|difficulty|hard to|trouble) breath(e|ing)?\b/,
    ],
  },
  {
    id: "infant",
    negatable: false,
    context: BABY,
    match: [
      /\b(difficult|hard|won'?t|wont|will not|can'?t|cannot|not able) to wake\b|\b(very|really) (sleepy|drowsy)\b|\bnot waking\b/,
      /\b(won'?t|wont|will not|can'?t|cannot|isn'?t|not) (wake|waking|woken)( up)?\b/,
      /\b(not|won'?t|isn'?t|can'?t|cannot|stopped|refusing to|unable to) (feeding|feed|drinking|drink|breastfeeding|breastfeed|suck\w*)\b/,
      /\bfloppy\b|\blimp\b/,
      /\bfits?\b|\bseizures?\b|\bconvuls\w*\b/,
      /\bvomit\w* everything\b/,
      /\bchest (is )?(pulling|sucking|drawing) in\b/,
      /\b(turning |turned |going )?blue\b/,
    ],
  },
];

// Words used to repair typos (taken from the patterns above).
const VOCAB = [
  "chest", "pressure", "tightness", "breathe", "breathing", "breath", "unconscious", "unresponsive", "collapsed",
  "fainted", "seizure", "seizures", "convulsion", "bleeding", "heavily", "vomiting", "swollen", "swelling",
  "tongue", "throat", "allergic", "anaphylaxis", "overdose", "overdosed", "poison", "poisoned", "pesticide",
  "kerosene", "snake", "suicide", "suicidal", "myself", "pregnant", "pregnancy", "headache", "blurred",
  "drooping", "slurred", "stroke", "weakness", "numbness", "accident", "injury", "newborn", "breastfeeding",
  "feeding", "drinking", "sleepy", "floppy", "delivery", "birth", "baby", "infant", "heart", "attack",
  "choking", "gasping", "tablets", "medicine", "kill", "die", "stiff", "fever", "confused", "breathless",
];

// Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions).
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const COMMON_FIXES: Record<string, string> = {
  cant: "can't",
  dont: "don't",
  wont: "won't",
  isnt: "isn't",
  im: "i'm",
  breth: "breathe",
  breathin: "breathing",
  preg: "pregnant",
  preggo: "pregnant",
};

// On prescriptions in India, "OD" means "once a day". Only treat a bare "OD"
// as "overdose" when the message is not about a prescription. Explicit forms
// ("OD'd", "took too many tablets") are always detected by the patterns.
const PRESCRIPTION_CONTEXT =
  /\b(prescri\w*|rx|tab|tabs|tablets?|caps?|capsules?|syrup|bd|bid|tds|tid|qid|hs|sos|prn|after food|before food|once a day|daily|label|meaning|mean|stand for|stands for)\b/;

// Real English words that look like typos of medical words. Never "correct"
// these, or ordinary messages would trigger false alarms
// (e.g. "baby not feeling well" must not become "not feeding").
const PROTECTED = new Set([
  "feeling", "feelings", "thinking", "sleeping", "sleep", "strike", "strikes", "heard", "chess", "cheat",
  "cheap", "beach", "heath", "death", "breeding", "speeding", "reading", "leading", "weeding", "needing",
  "heading", "sending", "seeing", "being", "drink", "drinks", "think", "thinks", "blessing", "bleed",
  "feed", "smoke", "stoke", "brother", "bother", "breaths", "nursing", "kidding", "killing", "dying",
  "myself", "shelf", "chesty", "tired", "attach", "attacks", "babe", "safety", "tablet", "medical",
]);

// 4-letter medical words: only fixed when the typo is a swap of two letters
// ("pian" -> "pain"), never a different word ("rain", "gain").
const VOCAB4 = ["pain", "fits", "wake", "bite", "blue", "limp"];

function isAdjacentSwap(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;
  const diff = [...a].map((c, i) => (c !== b[i] ? i : -1)).filter((i) => i >= 0);
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

function correct(word: string): string {
  if (COMMON_FIXES[word]) return COMMON_FIXES[word];
  if (PROTECTED.has(word) || VOCAB.includes(word)) return word;
  if (word.length === 4) return VOCAB4.find((v) => isAdjacentSwap(word, v)) ?? word;
  if (word.length < 5) return word;
  let best = word;
  let bestD = Infinity;
  const max = word.length >= 9 ? 2 : 1;
  for (const v of VOCAB) {
    if (Math.abs(v.length - word.length) > max) continue;
    const dist = distance(word, v);
    if (dist < bestD && dist <= max) {
      best = v;
      bestD = dist;
    }
  }
  return best;
}

// "|" marks a sentence or clause boundary. Negation never crosses it.
export function normalize(text: string): string {
  const prescription = PRESCRIPTION_CONTEXT.test(text.toLowerCase());
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,;:!?()\n]+/g, " | ")
    .replace(/[^a-z0-9'|\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w === "|" ? w : correct(w.replace(/^['-]+|['-]+$/g, ""))))
    .map((w) => (w === "od" && !prescription ? "overdose" : w))
    .join(" ");
}

const BOUNDARY = new Set(["|", "but", "and", "although", "though", "however", "except", "yet", "now", "so"]);

function negationScope(before: string): string {
  const words = before.split(" ").filter(Boolean);
  let start = Math.max(0, words.length - 4);
  for (let i = words.length - 1; i >= start; i--) {
    if (BOUNDARY.has(words[i])) {
      start = i + 1;
      break;
    }
  }
  return words.slice(start).join(" ");
}

const NEGATION = /\b(no|not|never|without|don'?t|doesn'?t|didn'?t|isn'?t|aren'?t|wasn'?t|haven'?t|hasn'?t|denies|nor)\b/;

export type Detection = {
  // Red flags clearly present: go to Emergency Mode.
  confirmed: RedFlagId[];
  // Red flags mentioned with a negation: must be asked about directly.
  // These are NEVER treated as "no emergency".
  needsConfirmation: RedFlagId[];
};

export function detectRedFlags(text: string): Detection {
  const confirmed = new Set<RedFlagId>();
  const needsConfirmation = new Set<RedFlagId>();
  if (typeof text !== "string" || text.trim() === "") {
    return { confirmed: [], needsConfirmation: [] };
  }

  const t = normalize(text.slice(0, 2000));

  // "What does shortness of breath mean?" asks about a word, not a symptom.
  // Only the uncertain "ask" patterns step aside; real red flags never do.
  const aboutAWord = /\b(what (does|do|is|are) .{1,40} mean\w*|meaning of|what is meant by|define)\b/.test(t);

  for (const p of patterns) {
    if (p.context && !p.context.test(t)) continue;
    if (p.ask && aboutAWord) continue;
    for (const re of p.match) {
      const global = new RegExp(re.source, "g");
      let m: RegExpExecArray | null;
      while ((m = global.exec(t))) {
        const scope = negationScope(t.slice(0, m.index));
        if (p.ask || (p.negatable && NEGATION.test(scope))) {
          needsConfirmation.add(p.id);
        } else {
          confirmed.add(p.id);
        }
        if (m[0].length === 0) global.lastIndex++;
      }
    }
  }

  for (const id of confirmed) needsConfirmation.delete(id);
  return { confirmed: [...confirmed], needsConfirmation: [...needsConfirmation] };
}
