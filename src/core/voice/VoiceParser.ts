export interface ParsedVoiceData {
  amount: number | null;
  type: "expense" | "income" | null;
  category: string | null;
  description: string;
}

// Spoken number words — both Hinglish (Latin) and Devanagari, since the browser
// transcribes hi-IN speech into Devanagari script.
const NUMBER_MAP: Record<string, number> = {
  // Hinglish
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, che: 6, chhe: 6,
  saat: 7, aath: 8, nau: 9, das: 10,
  sau: 100, hazaar: 1000, hazar: 1000, lakh: 100000, crore: 10000000,
  // Devanagari
  एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5, पांच: 5, छह: 6, छे: 6,
  सात: 7, आठ: 8, नौ: 9, दस: 10,
  सौ: 100, हज़ार: 1000, हजार: 1000, लाख: 100000, करोड़: 10000000,
};

const CATEGORY_MAP: Record<string, string> = {
  // Hinglish
  khana: "Groceries", khane: "Groceries", bhojan: "Groceries",
  petrol: "Travel", yatra: "Travel",
  bijli: "Utilities", makan: "Housing", rent: "Housing", kiraya: "Housing",
  cinema: "Entertainment", khel: "Entertainment",
  dawai: "Medical", dawa: "Medical", nivesh: "Investment",
  // Devanagari
  खाना: "Groceries", खाने: "Groceries", भोजन: "Groceries",
  पेट्रोल: "Travel", यात्रा: "Travel",
  बिजली: "Utilities", मकान: "Housing", किराया: "Housing",
  सिनेमा: "Entertainment", खेल: "Entertainment",
  दवाई: "Medical", दवा: "Medical", निवेश: "Investment",
};

const INCOME_WORDS = [
  "mila", "aaya", "prapt", "income", "kamaai",
  "मिला", "मिले", "आया", "प्राप्त", "कमाई", "आय",
];
const EXPENSE_WORDS = [
  "diya", "kharcha", "kharch", "gaya", "expense",
  "दिया", "खर्च", "खर्चा", "गया", "हुआ", "खरीदा",
];

export function parseVoiceInput(text: string): ParsedVoiceData {
  // Split into words and trim surrounding punctuation/symbols (e.g. a leading
  // "₹" or the Devanagari full-stop "।"). We keep digits, letters AND combining
  // marks (\p{M}) — Devanagari vowel signs like the "े" in "खाने" are marks, not
  // letters, so stripping them would corrupt the word.
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\d\p{L}\p{M}]+|[^\d\p{L}\p{M}]+$/gu, ""))
    .filter(Boolean);

  let amount: number | null = null;
  let type: "expense" | "income" | null = null;
  let category: string | null = null;

  // ── Extract amount ──────────────────────────────────────────────────────
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Pull the digits out of the token, ignoring any currency symbols or
    // separators that survived (e.g. "₹100", "rs.100", "1,000").
    const numericPart = word.replace(/[^\d.]/g, "");
    const parsedNumber = numericPart ? parseFloat(numericPart) : NaN;

    if (!isNaN(parsedNumber)) {
      amount = parsedNumber;
      // Look ahead for a multiplier like "sau"/"सौ" or "hazaar"/"हज़ार".
      const next = words[i + 1];
      if (next && NUMBER_MAP[next] && NUMBER_MAP[next] >= 100) {
        amount *= NUMBER_MAP[next];
      }
      break;
    }

    // Spoken number word (e.g. "paanch", "दो") possibly with a multiplier.
    if (NUMBER_MAP[word] && NUMBER_MAP[word] < 100) {
      let tempAmt = NUMBER_MAP[word];
      const next = words[i + 1];
      if (next && NUMBER_MAP[next] >= 100) {
        tempAmt *= NUMBER_MAP[next];
      }
      amount = tempAmt;
      break;
    }
  }

  // If no amount found, accept a standalone multiplier ("hazaar" = 1000).
  if (amount === null) {
    for (const word of words) {
      if (NUMBER_MAP[word] >= 100) {
        amount = NUMBER_MAP[word];
        break;
      }
    }
  }

  // ── Extract category ────────────────────────────────────────────────────
  for (const word of words) {
    if (CATEGORY_MAP[word]) {
      category = CATEGORY_MAP[word];
      break;
    }
    // Direct English category name match (e.g. "groceries").
    const englishMatch = Object.values(CATEGORY_MAP).find((c) => c.toLowerCase() === word);
    if (englishMatch) {
      category = englishMatch;
      break;
    }
  }

  // ── Extract type ────────────────────────────────────────────────────────
  for (const word of words) {
    if (INCOME_WORDS.some((w) => word.includes(w))) {
      type = "income";
      break;
    }
    if (EXPENSE_WORDS.some((w) => word.includes(w))) {
      type = "expense";
      break;
    }
  }

  // Default to expense if a value was spoken but no direction given.
  if (!type && amount !== null) {
    type = "expense";
  }

  // Default category fallbacks.
  if (!category && type === "expense") {
    category = "Housing";
  } else if (!category && type === "income") {
    category = "Salary";
  }

  return {
    amount,
    type,
    category,
    description: text, // Use full text as description
  };
}
