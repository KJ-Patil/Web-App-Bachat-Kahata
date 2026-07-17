import {
  Home,
  ShoppingBag,
  Tv,
  Layers,
  Navigation,
  Bus,
  HeartPulse,
  Shield,
  Book,
  Briefcase,
  Zap,
  Coffee,
  TrendingUp,
  Gift,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORY_BUCKET_MAP,
  type BucketType,
} from "@/core/utils/bucketConfig";
import {
  getCustomCategories,
  getArchivedCategoryIds,
} from "@/core/store/dataStore";

/**
 * Single source of truth for transaction/budget categories.
 *
 * Categories are managed by the user in Settings → Category Manager, which
 * persists them to `localStorage.custom_categories` (+ archived ids in
 * `archived_categories`). Every entry surface (Add Transaction, Set Budget,
 * Budgets page) reads through the helpers here so a category the user creates
 * or archives is reflected everywhere, instead of a duplicated hardcoded list.
 *
 * NOTE: categories are referenced by their `name` throughout the app
 * (`Transaction.category`, budget map keys), so the helpers expose names as the
 * stable identity — do not switch call sites to the internal `id`.
 */

/**
 * A category as stored in `localStorage.custom_categories`.
 *
 * Defined here rather than alongside the modal that creates it because
 * `bucketConfig` → `categories` → modal would otherwise form an import cycle.
 * `AddCategoryModal` re-exports this type for its existing consumers.
 */
export interface CategoryData {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string;
  iconName: string;
  /**
   * Which 50/30/20 bucket this category's spending counts toward. Expense-only
   * (buckets are meaningless for income) and optional, because categories
   * created before buckets were user-selectable have no stored value — those
   * fall back to CATEGORY_BUCKET_MAP. See `resolveBucketForCategory`.
   */
  bucket?: BucketType;
}

/** Resolves the stored icon name to its lucide component (Layers as fallback). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Home,
  ShoppingBag,
  Tv,
  Layers,
  Navigation,
  Bus,
  HeartPulse,
  Shield,
  Book,
  Briefcase,
  Zap,
  Coffee,
  TrendingUp,
  Gift,
  DollarSign,
};

export function resolveCategoryIcon(iconName: string): LucideIcon {
  return CATEGORY_ICONS[iconName] || Layers;
}

/**
 * The seed set used when the user has never opened the Category Manager.
 * Includes every option the entry forms historically offered (the four
 * expense buckets + Travel, and the Salary/Investment/Gift/Other income
 * buckets) so making the lists dynamic never removes a previously-available
 * choice.
 */
export const DEFAULT_CATEGORIES: CategoryData[] = [
  { id: "cat-1", name: "Housing", type: "expense", color: "#1d4ed8", iconName: "Home", bucket: "needs" },
  { id: "cat-2", name: "Groceries", type: "expense", color: "#059669", iconName: "ShoppingBag", bucket: "needs" },
  { id: "cat-3", name: "Entertainment", type: "expense", color: "#7c3aed", iconName: "Tv", bucket: "wants" },
  { id: "cat-4", name: "Investment", type: "expense", color: "#0891b2", iconName: "Layers", bucket: "investments" },
  { id: "cat-5", name: "Travel", type: "expense", color: "#ea580c", iconName: "Navigation", bucket: "wants" },
  { id: "cat-6", name: "Salary", type: "income", color: "#65a30d", iconName: "Briefcase" },
  { id: "cat-7", name: "Investment", type: "income", color: "#0891b2", iconName: "TrendingUp" },
  { id: "cat-8", name: "Gift", type: "income", color: "#db2777", iconName: "Gift" },
  { id: "cat-9", name: "Other", type: "income", color: "#525252", iconName: "DollarSign" },
];

/**
 * Extra categories surfaced under the "Other" expander in the Record
 * Transaction modal. These match the names in `bucketConfig`'s
 * CATEGORY_BUCKET_MAP so an expense picked here lands in the correct
 * Needs/Wants/Investments bucket. Grouped by bucket for the expense view;
 * shown as a flat list for income (buckets are an expense-only concept).
 */
export interface ExtraCategoryGroup {
  bucket: "Needs" | "Wants" | "Investments";
  categories: { name: string; iconName: string }[];
}

export const EXTRA_CATEGORY_GROUPS: ExtraCategoryGroup[] = [
  {
    bucket: "Needs",
    categories: [
      { name: "Mobile Bill", iconName: "Zap" },
      { name: "Phone Bill", iconName: "Zap" },
      { name: "Gas Bill", iconName: "Zap" },
      { name: "Cylinder Bill", iconName: "Zap" },
      { name: "Public Transport", iconName: "Bus" },
      { name: "Commute", iconName: "Bus" },
      { name: "Cab Fare", iconName: "Navigation" },
      { name: "Car Maintenance", iconName: "Navigation" },
      { name: "Bike Maintenance", iconName: "Navigation" },
      { name: "School Fees", iconName: "Book" },
      { name: "Childcare", iconName: "HeartPulse" },
      { name: "Basic Clothing", iconName: "ShoppingBag" },
    ],
  },
  {
    bucket: "Wants",
    categories: [
      { name: "Gifts", iconName: "Gift" },
      { name: "Donations", iconName: "Gift" },
      { name: "Personal Care", iconName: "HeartPulse" },
      { name: "Grooming", iconName: "HeartPulse" },
      { name: "Salon", iconName: "HeartPulse" },
      { name: "Gadgets", iconName: "Tv" },
      { name: "Tech", iconName: "Tv" },
      { name: "Home Decor", iconName: "Home" },
      { name: "Furniture", iconName: "Home" },
      { name: "Alcohol", iconName: "Coffee" },
      { name: "Parties", iconName: "Coffee" },
      { name: "Pubs", iconName: "Coffee" },
    ],
  },
  {
    bucket: "Investments",
    categories: [
      { name: "Cryptocurrency", iconName: "TrendingUp" },
      { name: "Digital Assets", iconName: "TrendingUp" },
      { name: "Bitcoin", iconName: "TrendingUp" },
      { name: "Ethereum", iconName: "TrendingUp" },
      { name: "Provident Fund", iconName: "Layers" },
      { name: "EPF", iconName: "Layers" },
      { name: "VPF", iconName: "Layers" },
      { name: "Extra Loan Payment", iconName: "DollarSign" },
      { name: "Real Estate", iconName: "Home" },
      { name: "Property Investment", iconName: "Home" },
      { name: "Child Savings Plan", iconName: "Shield" },
    ],
  },
];

/** Flat list of every expense "Other" category, across all buckets. */
export const EXTRA_CATEGORIES_FLAT: { name: string; iconName: string }[] =
  EXTRA_CATEGORY_GROUPS.flatMap((g) => g.categories);

/**
 * Income "Other" categories — sources of money (where income comes from), not
 * spending buckets. Grouped by the standard personal-finance classification of
 * income: Earned/Active (work), Investment/Portfolio (returns on capital), and
 * Passive & Other (money not tied to active work). India-relevant naming.
 */
export interface IncomeCategoryGroup {
  group: "Earned" | "Investment" | "Passive & Other";
  categories: { name: string; iconName: string }[];
}

export const INCOME_EXTRA_CATEGORY_GROUPS: IncomeCategoryGroup[] = [
  {
    group: "Earned",
    categories: [
      { name: "Salary", iconName: "Briefcase" },
      { name: "Bonus", iconName: "Gift" },
      { name: "Overtime", iconName: "Briefcase" },
      { name: "Commission", iconName: "DollarSign" },
      { name: "Freelance", iconName: "Briefcase" },
      { name: "Business Profit", iconName: "TrendingUp" },
      { name: "Tips", iconName: "Coffee" },
    ],
  },
  {
    group: "Investment",
    categories: [
      { name: "Dividends", iconName: "TrendingUp" },
      { name: "Interest", iconName: "DollarSign" },
      { name: "Capital Gains", iconName: "TrendingUp" },
      { name: "Mutual Fund Returns", iconName: "Layers" },
      { name: "Stock Gains", iconName: "TrendingUp" },
      { name: "Crypto Gains", iconName: "TrendingUp" },
    ],
  },
  {
    group: "Passive & Other",
    categories: [
      { name: "Rental Income", iconName: "Home" },
      { name: "Royalty", iconName: "Book" },
      { name: "Pension", iconName: "Shield" },
      { name: "Gift Received", iconName: "Gift" },
      { name: "Cashback / Rewards", iconName: "ShoppingBag" },
      { name: "Refund", iconName: "DollarSign" },
      { name: "Government Benefit", iconName: "Shield" },
    ],
  },
];

/** Flat list of every income "Other" category. */
export const INCOME_EXTRA_CATEGORIES_FLAT: { name: string; iconName: string }[] =
  INCOME_EXTRA_CATEGORY_GROUPS.flatMap((g) => g.categories);

/** Fast membership test — true if a name belongs to the expense "Other" set. */
export function isExtraCategory(name: string): boolean {
  return EXTRA_CATEGORIES_FLAT.some((c) => c.name === name);
}

/** Fast membership test — true if a name belongs to the income "Other" set. */
export function isIncomeExtraCategory(name: string): boolean {
  return INCOME_EXTRA_CATEGORIES_FLAT.some((c) => c.name === name);
}

/**
 * Maps an income category name → its income group. Mirrors
 * `resolveBucketForCategory` for the income side. Built from INCOME_EXTRA_CATEGORY_GROUPS,
 * plus the default income categories from DEFAULT_CATEGORIES that aren't in the
 * extra groups. Returns null for unknown names.
 */
const INCOME_GROUP_BY_NAME: Record<string, IncomeCategoryGroup["group"]> = (() => {
  const map: Record<string, IncomeCategoryGroup["group"]> = {};
  for (const g of INCOME_EXTRA_CATEGORY_GROUPS) {
    for (const c of g.categories) map[c.name] = g.group;
  }
  // Default income categories (see DEFAULT_CATEGORIES): treat the built-in
  // "Investment" income category as an investment return; Salary/Gift map to
  // their natural groups.
  map["Investment"] = "Investment";
  map["Salary"] = "Earned";
  map["Gift"] = "Passive & Other";
  return map;
})();

export function getIncomeGroupForCategory(
  name: string
): IncomeCategoryGroup["group"] | null {
  if (!name) return null;
  return INCOME_GROUP_BY_NAME[name.trim()] ?? null;
}

/**
 * Reads the user's stored categories, falling back to defaults (SSR-safe).
 *
 * Goes through the data store rather than localStorage: categories carry the
 * bucket choices the Money Rule computes from, so they are encrypted at rest
 * and synced like the rest of the user's financial data.
 */
export function getStoredCategories(): CategoryData[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  const stored = getCustomCategories();
  return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_CATEGORIES;
}

function getArchivedIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = getArchivedCategoryIds();
  return Array.isArray(stored) ? stored : [];
}

/**
 * Active (non-archived) categories, optionally filtered by type — this is what
 * the entry surfaces render.
 */
export function getActiveCategories(type?: "expense" | "income"): CategoryData[] {
  const archived = getArchivedIds();
  return getStoredCategories()
    .filter((c) => !archived.includes(c.id))
    .filter((c) => (type ? c.type === type : true));
}

/**
 * The 50/30/20 bucket an expense category counts toward — the app-wide answer,
 * and what every spending rollup should call.
 *
 * Resolution is layered, most specific first:
 *   1. the bucket the user picked for their own category (Category Manager);
 *   2. CATEGORY_BUCKET_MAP, for the built-in and "Other" category names;
 *   3. "needs", as a last resort.
 *
 * Layer 2 is why no migration is needed: categories stored before `bucket`
 * existed resolve exactly as they did when the map was the only lookup.
 *
 * Archived categories are still resolved — old transactions keep their category
 * name, and their history must stay in the bucket the user assigned.
 */
export function resolveBucketForCategory(name: string): BucketType {
  if (!name) return "needs";
  const normalized = name.trim();

  const userCategory = getStoredCategories().find(
    (c) => c.type === "expense" && c.name === normalized && c.bucket
  );
  if (userCategory?.bucket) return userCategory.bucket;

  return CATEGORY_BUCKET_MAP[normalized] || "needs";
}
