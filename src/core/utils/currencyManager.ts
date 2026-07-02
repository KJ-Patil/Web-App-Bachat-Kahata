export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  decimalDigits: number;
}

export const PRESET_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", decimalDigits: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", decimalDigits: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE", decimalDigits: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU", decimalDigits: 2 },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Live exchange rates
 *
 * All amounts in the app are stored in the base currency (INR). The active
 * currency is a DISPLAY preference — `formatAmount` converts base→active using
 * the rates below so switching currency actually re-values numbers instead of
 * only relabelling the symbol.
 *
 * Rates mean "units of the target currency per 1 INR". They are refreshed from a
 * free, no-key API (open.er-api.com) and cached in localStorage; a small static
 * table is used as an offline/first-paint fallback. INR is always 1.
 * ──────────────────────────────────────────────────────────────────────────── */
export const BASE_CURRENCY = "INR";
const FX_CACHE_KEY = "fx_rates";
const FX_TTL_MS = 12 * 60 * 60 * 1000; // refresh at most twice a day

// Approximate fallback so conversion works before the first live fetch / offline.
const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  AUD: 0.018,
};

let ratesCache: Record<string, number> | null = null;
let ratesHydrated = false;

// Lazily pull any cached rates from localStorage into memory (SSR-safe).
function hydrateRates(): void {
  if (ratesHydrated || typeof window === "undefined") return;
  ratesHydrated = true;
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.rates && typeof parsed.rates === "object") {
      ratesCache = parsed.rates;
    }
  } catch {
    /* ignore malformed cache */
  }
}

/**
 * Synchronous rate lookup (base INR → `currencyCode`). Falls back to the cached
 * value, then the static table, then 1. Always returns a finite positive number
 * so `formatAmount` stays pure and safe.
 */
export function getExchangeRate(currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  if (code === BASE_CURRENCY) return 1;
  hydrateRates();
  const live = ratesCache?.[code];
  if (typeof live === "number" && isFinite(live) && live > 0) return live;
  const fallback = FALLBACK_RATES[code];
  return typeof fallback === "number" && fallback > 0 ? fallback : 1;
}

/**
 * Fetches fresh rates (base INR) and caches them. No-ops on the server, when the
 * cache is still fresh (unless `force`), or on any network error — existing
 * cache / fallback keep working. Safe to call on every app load.
 */
export async function refreshExchangeRates(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!force && parsed?.ts && Date.now() - parsed.ts < FX_TTL_MS) {
      ratesCache = parsed.rates;
      ratesHydrated = true;
      return; // still fresh
    }

    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.result === "success" && data.rates) {
      ratesCache = data.rates;
      ratesHydrated = true;
      localStorage.setItem(
        FX_CACHE_KEY,
        JSON.stringify({ base: BASE_CURRENCY, rates: data.rates, ts: Date.now() })
      );
    }
  } catch {
    /* offline or blocked — keep whatever cache/fallback we have */
  }
}

/**
 * Formats a numeric amount into a currency string representation.
 * Supports Indian numbering layout (Lakhs/Crores) for INR and standard international configurations for other currencies.
 * 
 * @param amount Numeric value to format.
 * @param currencyCode Three-letter currency code (defaults to "INR").
 * @param options Formatting customization options.
 * @returns Formatted currency string.
 */
export function formatAmount(
  amount: number,
  currencyCode: string = "INR",
  options: {
    includeSymbol?: boolean;
    decimalPlaces?: number;
    useIndianLayoutForINR?: boolean;
    convert?: boolean;
  } = {}
): string {
  // Guard against invalid inputs (NaN or Infinity)
  if (isNaN(amount) || !isFinite(amount)) {
    return "—";
  }

  const {
    includeSymbol = true,
    decimalPlaces,
    useIndianLayoutForINR = true,
    convert = true,
  } = options;

  const upperCode = currencyCode.toUpperCase();
  const currency = PRESET_CURRENCIES[upperCode] || {
    code: upperCode,
    symbol: "",
    name: "",
    locale: "en-US",
    decimalDigits: 2,
  };

  // Amounts are stored in the base currency (INR); convert to the display
  // currency using live rates. `convert: false` opts out (value already in the
  // target currency). INR resolves to a 1:1 rate, so INR display is unchanged.
  const value = convert ? amount * getExchangeRate(upperCode) : amount;

  const finalDecimalPlaces = decimalPlaces !== undefined ? decimalPlaces : currency.decimalDigits;

  // Custom INR Indian numbering system layout rule (1,23,456.78)
  if (currency.code === "INR" && useIndianLayoutForINR) {
    try {
      const formatter = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: finalDecimalPlaces,
        maximumFractionDigits: finalDecimalPlaces,
        useGrouping: true,
      });
      const formattedNumber = formatter.format(value);
      return includeSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
    } catch (e) {
      // Manual fallback logic for Indian grouping format if Intl fails or is not supported
      const isNegative = value < 0;
      const absAmount = Math.abs(value);
      const parts = absAmount.toFixed(finalDecimalPlaces).split(".");
      let x = parts[0];
      const y = parts[1] ? "." + parts[1] : "";

      const lastThree = x.substring(x.length - 3);
      const otherNumbers = x.substring(0, x.length - 3);
      if (otherNumbers !== "") {
        x = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
      } else {
        x = lastThree;
      }

      const formattedNumber = (isNegative ? "-" : "") + x + y;
      return includeSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
    }
  }

  // Standard formatting for all other global currencies
  try {
    if (includeSymbol) {
      const currencyFormatter = new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: finalDecimalPlaces,
        maximumFractionDigits: finalDecimalPlaces,
      });
      return currencyFormatter.format(value);
    }

    const formatter = new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: finalDecimalPlaces,
      maximumFractionDigits: finalDecimalPlaces,
      useGrouping: true,
    });
    return formatter.format(value);
  } catch (e) {
    // Fallback standard international layout
    const formattedNumber = value.toLocaleString(undefined, {
      minimumFractionDigits: finalDecimalPlaces,
      maximumFractionDigits: finalDecimalPlaces,
    });
    return includeSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
  }
}

/**
 * Gets the symbol associated with a currency code.
 * 
 * @param currencyCode Three-letter currency code.
 * @returns The currency symbol string, or empty if not found.
 */
export function getCurrencySymbol(currencyCode: string): string {
  const upperCode = currencyCode.toUpperCase();
  return PRESET_CURRENCIES[upperCode]?.symbol || "";
}

/**
 * Gets details of a specific currency code if preset.
 * 
 * @param currencyCode Three-letter currency code.
 * @returns The CurrencyInfo object, or undefined.
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo | undefined {
  return PRESET_CURRENCIES[currencyCode.toUpperCase()];
}

/**
 * Gets a list of all configured currencies.
 * 
 * @returns Array of preset CurrencyInfo objects.
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(PRESET_CURRENCIES);
}

/**
 * Utility function to convert values between rates.
 * 
 * @param amount Numeric value to convert.
 * @param fromRate Exchange rate from source currency to base currency.
 * @param toRate Exchange rate from base currency to target currency.
 * @returns The converted amount.
 */
export function convertAmount(amount: number, fromRate: number, toRate: number): number {
  if (isNaN(amount) || fromRate <= 0 || toRate <= 0) {
    return 0;
  }
  // Convert from source currency to base currency, then to target currency
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}
