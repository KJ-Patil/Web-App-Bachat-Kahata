export type BucketType = "needs" | "wants" | "investments";

export const BUCKET_PERCENTAGES: Record<BucketType, number> = {
  needs: 0.50,
  wants: 0.30,
  investments: 0.20,
};

// Maps categories to their respective 50/30/20 buckets
export const CATEGORY_BUCKET_MAP: Record<string, BucketType> = {
  // Needs
  "Rent": "needs",
  "Home EMI": "needs",
  "Utilities": "needs",
  "Electricity": "needs",
  "Water Bill": "needs",
  "Internet": "needs",
  "Groceries": "needs",
  "Fuel (Essential)": "needs",
  "Insurance": "needs",
  "Medical": "needs",
  "Loan EMI": "needs",
  "Minimum Credit Card Payment": "needs",
  "Housing": "needs", // Map default category as well

  // Wants
  "Dining Out": "wants",
  "Shopping": "wants",
  "Entertainment": "wants",
  "Travel": "wants",
  "Subscriptions": "wants",
  "Movies": "wants",
  "Coffee": "wants",
  "Hobbies": "wants",
  "Gaming": "wants",
  "Gym": "wants",

  // Investments
  "Fixed Deposit (FD)": "investments",
  "SIP": "investments",
  "Mutual Funds": "investments",
  "Stocks": "investments",
  "PPF": "investments",
  "NPS": "investments",
  "Emergency Fund": "investments",
  "Gold Investment": "investments",
  "Investment": "investments", // Map default category as well
};

/**
 * Returns the bucket for a given category name.
 * Default is "needs" for unmapped/uncategorized expenses.
 */
export function getBucketForCategory(category: string): BucketType {
  if (!category) return "needs";
  const normalized = category.trim();
  return CATEGORY_BUCKET_MAP[normalized] || "needs";
}
