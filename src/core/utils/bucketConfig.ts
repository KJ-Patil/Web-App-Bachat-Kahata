export type BucketType = "needs" | "wants" | "investments";

export const BUCKET_PERCENTAGES: Record<BucketType, number> = {
  needs: 0.50,
  wants: 0.30,
  investments: 0.20,
};

/**
 * Built-in category name → 50/30/20 bucket.
 *
 * This is the *fallback* layer only. A user's own category carries its own
 * `bucket` (see CategoryData), which wins over this map — so resolve buckets
 * through `resolveBucketForCategory` in core/utils/categories, never by reading
 * this map directly, or user-created categories will be misfiled as needs.
 */
export const CATEGORY_BUCKET_MAP: Record<string, BucketType> = {
  // Needs
  "Rent": "needs",
  "Home EMI": "needs",
  "Utilities": "needs",
  "Electricity": "needs",
  "Water Bill": "needs",
  "Internet": "needs",
  "Groceries": "needs",
  "Food": "needs", // Eating in general; "Dining Out" stays a want
  "Fuel (Essential)": "needs",
  "Insurance": "needs",
  "Medical": "needs",
  "Loan EMI": "needs",
  "Minimum Credit Card Payment": "needs",
  "Housing": "needs", // Map default category as well
  "Mobile Bill": "needs",
  "Phone Bill": "needs",
  "Gas Bill": "needs",
  "Cylinder Bill": "needs",
  "Public Transport": "needs",
  "Commute": "needs",
  "Cab Fare": "needs",
  "Car Maintenance": "needs",
  "Bike Maintenance": "needs",
  "School Fees": "needs",
  "Childcare": "needs",
  "Basic Clothing": "needs",
  // Deposits into a savings goal the user tagged as a "need" (see LogDepositModal).
  "Savings (Needs)": "needs",

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
  "Gifts": "wants",
  "Donations": "wants",
  "Personal Care": "wants",
  "Grooming": "wants",
  "Salon": "wants",
  "Gadgets": "wants",
  "Tech": "wants",
  "Home Decor": "wants",
  "Furniture": "wants",
  "Alcohol": "wants",
  "Parties": "wants",
  "Pubs": "wants",
  // Deposits into a savings goal the user tagged as a "want" (see LogDepositModal).
  "Savings (Wants)": "wants",

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
  "Cryptocurrency": "investments",
  "Digital Assets": "investments",
  "Bitcoin": "investments",
  "Ethereum": "investments",
  "Provident Fund": "investments",
  "EPF": "investments",
  "VPF": "investments",
  "Extra Loan Payment": "investments",
  "Real Estate": "investments",
  "Property Investment": "investments",
  "Child Savings Plan": "investments",
};

/**
 * The expense category a savings-goal deposit is logged under, per the bucket
 * the user tagged the goal with. "investments" keeps the original "Investment"
 * category so existing goals and their past deposits stay consistent.
 */
export const SAVINGS_DEPOSIT_CATEGORY: Record<BucketType, string> = {
  needs: "Savings (Needs)",
  wants: "Savings (Wants)",
  investments: "Investment",
};

/** Human label for each bucket, used in goal-tagging UI. */
export const BUCKET_LABELS: Record<BucketType, string> = {
  needs: "Needs",
  wants: "Wants",
  investments: "Investments",
};
