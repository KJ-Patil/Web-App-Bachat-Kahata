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
import type { CategoryData } from "@/components/modals/AddCategoryModal";

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

const STORAGE_KEY = "custom_categories";
const ARCHIVED_KEY = "archived_categories";

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
  { id: "cat-1", name: "Housing", type: "expense", color: "#1d4ed8", iconName: "Home" },
  { id: "cat-2", name: "Groceries", type: "expense", color: "#059669", iconName: "ShoppingBag" },
  { id: "cat-3", name: "Entertainment", type: "expense", color: "#7c3aed", iconName: "Tv" },
  { id: "cat-4", name: "Investment", type: "expense", color: "#0891b2", iconName: "Layers" },
  { id: "cat-5", name: "Travel", type: "expense", color: "#ea580c", iconName: "Navigation" },
  { id: "cat-6", name: "Salary", type: "income", color: "#65a30d", iconName: "Briefcase" },
  { id: "cat-7", name: "Investment", type: "income", color: "#0891b2", iconName: "TrendingUp" },
  { id: "cat-8", name: "Gift", type: "income", color: "#db2777", iconName: "Gift" },
  { id: "cat-9", name: "Other", type: "income", color: "#525252", iconName: "DollarSign" },
];

/** Reads the user's stored categories, falling back to defaults (SSR-safe). */
export function getStoredCategories(): CategoryData[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(stored) as CategoryData[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function getArchivedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ARCHIVED_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
