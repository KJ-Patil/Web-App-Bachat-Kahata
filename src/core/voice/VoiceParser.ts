export interface ParsedVoiceData {
  amount: number | null;
  type: "expense" | "income" | null;
  category: string | null;
  description: string;
}

const NUMBER_MAP: Record<string, number> = {
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  sau: 100,
  hazaar: 1000,
  lakh: 100000,
};

const CATEGORY_MAP: Record<string, string> = {
  khana: "Groceries",
  bhojan: "Groceries",
  petrol: "Travel",
  yatra: "Travel",
  bijli: "Utilities",
  makan: "Housing",
  rent: "Housing",
  cinema: "Entertainment",
  khel: "Entertainment",
  dawai: "Medical",
  nivesh: "Investment",
};

const INCOME_WORDS = ["mila", "aaya", "prapt", "income", "kamaai"];
const EXPENSE_WORDS = ["diya", "kharcha", "gaya", "expense", "kharch"];

export function parseVoiceInput(text: string): ParsedVoiceData {
  const words = text.toLowerCase().split(/\s+/);
  
  let amount: number | null = null;
  let type: "expense" | "income" | null = null;
  let category: string | null = null;
  
  // Extract amount
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check direct numeric match
    const parsedNumber = parseFloat(word);
    if (!isNaN(parsedNumber)) {
      amount = parsedNumber;
      
      // Look ahead for multipliers like 'sau', 'hazaar'
      if (i + 1 < words.length && NUMBER_MAP[words[i + 1]]) {
        amount *= NUMBER_MAP[words[i + 1]];
      }
      break;
    }
    
    // Check hindi number words
    if (NUMBER_MAP[word] && NUMBER_MAP[word] < 100) {
      let tempAmt = NUMBER_MAP[word];
      if (i + 1 < words.length && NUMBER_MAP[words[i + 1]] >= 100) {
        tempAmt *= NUMBER_MAP[words[i + 1]];
      }
      amount = tempAmt;
      break;
    }
  }

  // If no amount found, check for standalone multipliers like "hazaar" = 1000
  if (amount === null) {
    for (const word of words) {
      if (NUMBER_MAP[word] >= 100) {
        amount = NUMBER_MAP[word];
        break;
      }
    }
  }

  // Extract Category
  for (const word of words) {
    if (CATEGORY_MAP[word]) {
      category = CATEGORY_MAP[word];
      break;
    }
    // Simple substring match for English words directly
    const matchingKey = Object.values(CATEGORY_MAP).find(c => c.toLowerCase() === word);
    if (matchingKey) {
      category = matchingKey;
      break;
    }
  }

  // Extract Type
  for (const word of words) {
    if (INCOME_WORDS.some(w => word.includes(w))) {
      type = "income";
      break;
    }
    if (EXPENSE_WORDS.some(w => word.includes(w))) {
      type = "expense";
      break;
    }
  }
  
  // Default to expense if not specified
  if (!type && amount !== null) {
    type = "expense";
  }

  // Default category if not found
  if (!category && type === "expense") {
    category = "Housing"; // Fallback category
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
