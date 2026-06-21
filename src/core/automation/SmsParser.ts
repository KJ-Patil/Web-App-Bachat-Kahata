// ─── Output Types ──────────────────────────────────────────────────────────────

export type ParsedTransactionType = "income" | "expense";

export interface ParsedSmsTransaction {
  type: ParsedTransactionType;
  amount: number;
  /** Merchant / narration cleaned of noise tokens */
  description: string;
  /** Detected bank or payment network */
  source: string;
  /** ISO date string — Date.now() at parse time */
  date: string;
  /** The raw original message, preserved for audit */
  rawMessage: string;
}

// ─── Bank / Network Rule Definitions ─────────────────────────────────────────

interface BankRule {
  name: string;
  /**
   * Each pattern must contain a named capture group `amount` and optionally
   * `desc` (merchant/narration). Type is determined separately via
   * `DEBIT_SIGNALS` / `CREDIT_SIGNALS`.
   */
  patterns: RegExp[];
}

const BANK_RULES: BankRule[] = [
  // ── HDFC ──────────────────────────────────────────────────────────────────
  {
    name: "HDFC Bank",
    patterns: [
      // "Rs.12,500.00 debited from A/c ...1234 on 15-06-24. Info: ZOMATO"
      /(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?:debited|credited)\s+(?:from|to)\s+(?:a\/c|acct?\.?|account)[^\n.]*?(?:Info[:\s]+(?<desc>[^\n.]+))?/i,
      // "HDFC Bank: INR 5000.00 sent via UPI to merchant@upi"
      /HDFC\s+Bank[:\s]+(?:INR|Rs\.?)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?:sent|received)\s+(?:via\s+UPI\s+)?(?:to|from)\s+(?<desc>[^\s,.\n]+)/i,
    ],
  },

  // ── SBI ───────────────────────────────────────────────────────────────────
  {
    name: "SBI",
    patterns: [
      // "Your A/c XXXX1234 is debited by Rs 3200.00 on 14Jun24. Trf to GROCERS PVT"
      /(?:a\/c|account)\s+(?:no\.?\s+)?[xX\d]+\s+is\s+(?<typeword>debited|credited)\s+by\s+(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)[^.]*?(?:Trf\s+(?:to|from)\s+(?<desc>[^\n.]+))?/i,
      // "SBI: Debit of Rs.1500 from AC XXXX on DD-MM-YYYY. Ref NEFT"
      /SBI[:\s]+(?<typeword>Debit|Credit)\s+of\s+(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)[^.]*?Ref\s+(?<desc>[^\n.]+)/i,
    ],
  },

  // ── ICICI ─────────────────────────────────────────────────────────────────
  {
    name: "ICICI Bank",
    patterns: [
      // "ICICI Bank Acct XX1234 debited for Rs 8,000.00 on 13-Jun-2024; AMAZON"
      /ICICI\s+Bank\s+Acct\s+[xX\d]+\s+(?<typeword>debited|credited)\s+for\s+(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)[^;]*?(?:;\s*(?<desc>[^\n.]+))?/i,
      // "Dear Customer, INR 25000.00 credited to your ICICI Bank Account XX5678. From: EMPLOYER"
      /INR\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>credited|debited)\s+to\s+your\s+ICICI[^.]*?(?:From:\s*(?<desc>[^\n.]+))?/i,
    ],
  },

  // ── AXIS ──────────────────────────────────────────────────────────────────
  {
    name: "Axis Bank",
    patterns: [
      // "Axis Bank: Rs.2,400 debited from Savings A/c XX9012 on 12Jun24 for SWIGGY"
      /Axis\s+Bank[:\s]+(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>debited|credited)\s+from\s+(?:Savings\s+)?A\/c\s+[xX\d]+[^.]*?(?:for\s+(?<desc>[^\n.]+))?/i,
      // "Your Axis Bank a/c XX1234 has been credited with INR 98000.00. Ref: SALARY JUNE"
      /Axis\s+Bank\s+a\/c\s+[xX\d]+\s+has\s+been\s+(?<typeword>credited|debited)\s+with\s+(?:INR|Rs\.?)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)[^.]*?(?:Ref:\s*(?<desc>[^\n.]+))?/i,
    ],
  },

  // ── Kotak ─────────────────────────────────────────────────────────────────
  {
    name: "Kotak Bank",
    patterns: [
      /Kotak[:\s]+(?:INR|Rs\.?)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>debited|credited)[^.]*?(?:at\s+(?<desc>[^\s,.\n]+))?/i,
    ],
  },

  // ── Generic UPI (Google Pay, PhonePe, Paytm, BHIM) ───────────────────────
  {
    name: "UPI",
    patterns: [
      // "₹500 paid to merchant@upi via GooglePay"
      /[₹₨]?\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>paid|sent|received|debited|credited)\s+(?:to|from)\s+(?<desc>[^\s,.\n@]+)/i,
      // "Payment of Rs 1200 sent to Flipkart@ybl. UPI Ref: 123456789"
      /Payment\s+of\s+(?:Rs\.?|INR)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>sent|received|paid)\s+(?:to|from)\s+(?<desc>[^\s.\n@]+)/i,
      // "You sent ₹3,500 to 9876543210@paytm"
      /You\s+(?<typeword>sent|received|paid)\s+[₹₨]?\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?:to|from)\s+(?<desc>[^\s.\n@]+)/i,
      // "PhonePe: Rs 450.00 debited from Bank A/c for UBER"
      /(?:PhonePe|Paytm|GooglePay|BHIM|GPay)[:\s]+(?:Rs\.?|INR|[₹₨])\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>debited|credited|sent|received)[^.]*?(?:for\s+(?<desc>[^\n.]+))?/i,
    ],
  },

  // ── Generic / Fallback ────────────────────────────────────────────────────
  {
    name: "Bank Alert",
    patterns: [
      // Broad fallback: any "Rs/INR amount debited/credited" pattern
      /(?:Rs\.?|INR|[₹₨])\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?<typeword>debited|credited|paid|sent|received)/i,
    ],
  },
];

// ─── Signal Keyword Sets ──────────────────────────────────────────────────────

const DEBIT_SIGNALS = [
  "debit",
  "debited",
  "paid",
  "sent",
  "withdrawn",
  "purchase",
  "payment",
  "spent",
  "charged",
];

const CREDIT_SIGNALS = [
  "credit",
  "credited",
  "received",
  "deposited",
  "refund",
  "cashback",
  "salary",
  "inward",
  "neft",
  "imps cr",
];

// ─── Description Noise Tokens ─────────────────────────────────────────────────

const NOISE_PATTERNS = [
  /\b(?:upi|neft|imps|rtgs|ref|txn|transaction|a\/c|acct?|account|xx+\d+|x+\d+)\b/gi,
  /\b\d{6,}\b/g,           // Long numeric refs
  /(?:on|at|for|via)\s+/gi,
  /[/\\|_\-]+/g,
  /\s{2,}/g,
];

function cleanDescription(raw: string): string {
  let cleaned = raw.trim();
  for (const noise of NOISE_PATTERNS) {
    cleaned = cleaned.replace(noise, " ");
  }
  return cleaned
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[^a-zA-Z0-9₹]+/, "")
    .replace(/[^a-zA-Z0-9₹]+$/, "");
}

function parseAmount(raw: string): number {
  // Strip commas and parse
  const cleaned = raw.replace(/,/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function detectTypeFromKeywords(text: string): ParsedTransactionType | null {
  const lower = text.toLowerCase();
  for (const signal of CREDIT_SIGNALS) {
    if (lower.includes(signal)) return "income";
  }
  for (const signal of DEBIT_SIGNALS) {
    if (lower.includes(signal)) return "expense";
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a raw Indian bank SMS / notification string and extracts a structured
 * transaction object. Returns `null` if no amount can be detected.
 *
 * Works entirely client-side with no network calls or external dependencies.
 */
export function parseSmsMessage(raw: string): ParsedSmsTransaction | null {
  if (!raw || raw.trim().length < 5) return null;

  const message = raw.trim();

  for (const bank of BANK_RULES) {
    for (const pattern of bank.patterns) {
      const match = message.match(pattern);
      if (!match?.groups) continue;

      const { amount: rawAmount, desc, typeword } = match.groups;
      if (!rawAmount) continue;

      const amount = parseAmount(rawAmount);
      if (amount <= 0) continue;

      // Determine direction: prefer named capture `typeword`, fall back to
      // full-message keyword scan
      let type: ParsedTransactionType;
      if (typeword) {
        const lowerType = typeword.toLowerCase();
        const isCreditWord = CREDIT_SIGNALS.some((s) => lowerType.includes(s));
        type = isCreditWord ? "income" : "expense";
      } else {
        type = detectTypeFromKeywords(message) ?? "expense";
      }

      const description = desc
        ? cleanDescription(desc)
        : cleanDescription(bank.name !== "Bank Alert" ? bank.name : "");

      return {
        type,
        amount,
        description: description || (type === "income" ? "Inward Transfer" : "Outward Payment"),
        source: bank.name,
        date: new Date().toISOString(),
        rawMessage: message,
      };
    }
  }

  // No pattern matched — attempt last-resort amount extraction
  const amountMatch = message.match(/(?:Rs\.?|INR|[₹₨])\s*(?<amount>[\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch?.groups?.amount) {
    const amount = parseAmount(amountMatch.groups.amount);
    if (amount > 0) {
      const type = detectTypeFromKeywords(message) ?? "expense";
      return {
        type,
        amount,
        description: type === "income" ? "Inward Transfer" : "Outward Payment",
        source: "Bank Alert",
        date: new Date().toISOString(),
        rawMessage: message,
      };
    }
  }

  return null;
}

/**
 * Attempts to parse multiple SMS messages at once.
 * Invalid / unrecognised messages are silently skipped.
 */
export function parseSmsMessages(messages: string[]): ParsedSmsTransaction[] {
  return messages.flatMap((msg) => {
    const result = parseSmsMessage(msg);
    return result ? [result] : [];
  });
}
