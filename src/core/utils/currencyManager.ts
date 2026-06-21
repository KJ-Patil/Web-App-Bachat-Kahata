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
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", decimalDigits: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP", decimalDigits: 0 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU", decimalDigits: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA", decimalDigits: 2 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "fr-CH", decimalDigits: 2 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", decimalDigits: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK", decimalDigits: 2 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ", decimalDigits: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG", decimalDigits: 2 },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE", decimalDigits: 2 },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "no-NO", decimalDigits: 2 },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK", decimalDigits: 2 },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR", decimalDigits: 2 },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU", decimalDigits: 2 },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR", decimalDigits: 2 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA", decimalDigits: 2 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE", decimalDigits: 2 },
  SAR: { code: "SAR", symbol: "ر.س", name: "Saudi Riyal", locale: "ar-SA", decimalDigits: 2 },
  MXN: { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX", decimalDigits: 2 },
};

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
  } = options;

  const upperCode = currencyCode.toUpperCase();
  const currency = PRESET_CURRENCIES[upperCode] || {
    code: upperCode,
    symbol: "",
    name: "",
    locale: "en-US",
    decimalDigits: 2,
  };

  const finalDecimalPlaces = decimalPlaces !== undefined ? decimalPlaces : currency.decimalDigits;

  // Custom INR Indian numbering system layout rule (1,23,456.78)
  if (currency.code === "INR" && useIndianLayoutForINR) {
    try {
      const formatter = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: finalDecimalPlaces,
        maximumFractionDigits: finalDecimalPlaces,
        useGrouping: true,
      });
      const formattedNumber = formatter.format(amount);
      return includeSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
    } catch (e) {
      // Manual fallback logic for Indian grouping format if Intl fails or is not supported
      const isNegative = amount < 0;
      const absAmount = Math.abs(amount);
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
      return currencyFormatter.format(amount);
    }

    const formatter = new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: finalDecimalPlaces,
      maximumFractionDigits: finalDecimalPlaces,
      useGrouping: true,
    });
    return formatter.format(amount);
  } catch (e) {
    // Fallback standard international layout
    const formattedNumber = amount.toLocaleString(undefined, {
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
