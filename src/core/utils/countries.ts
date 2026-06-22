/**
 * Country metadata used for phone-number entry and validation.
 *
 * Each entry carries the international dialing code, the valid length range of
 * the *national* number (the digits AFTER the dial code), the country's
 * currency code (aligned with PRESET_CURRENCIES in currencyManager), and a flag.
 *
 * Phone length ranges are the E.164 *national significant number* digit counts —
 * i.e. the digits AFTER the dial code, EXCLUDING the national trunk "0". This is
 * why countries with a trunk zero (e.g. Australia, Switzerland, South Africa)
 * are 9 here even though their domestic "0-prefixed" format is 10 digits.
 * Ranges are intentionally lenient (min..max) where mobile vs landline differ.
 * Verified against the ITU E.164 plan and libphonenumber conventions.
 */

export interface CountryInfo {
  name: string;
  iso2: string;     // ISO 3166-1 alpha-2, e.g. "IN" — the stable lookup key
  dialCode: string; // e.g. "+91"
  minLength: number; // min digits of the national number
  maxLength: number; // max digits of the national number
  currency: string; // ISO 4217 currency code, e.g. "INR"
  flag: string;     // emoji flag
}

export const COUNTRIES: CountryInfo[] = [
  { name: "India",          iso2: "IN", dialCode: "+91",  minLength: 10, maxLength: 10, currency: "INR", flag: "🇮🇳" },
  { name: "United States",  iso2: "US", dialCode: "+1",   minLength: 10, maxLength: 10, currency: "USD", flag: "🇺🇸" },
  { name: "Canada",         iso2: "CA", dialCode: "+1",   minLength: 10, maxLength: 10, currency: "CAD", flag: "🇨🇦" },
  { name: "United Kingdom", iso2: "GB", dialCode: "+44",  minLength: 10, maxLength: 10, currency: "GBP", flag: "🇬🇧" },
  { name: "Australia",      iso2: "AU", dialCode: "+61",  minLength: 9,  maxLength: 9,  currency: "AUD", flag: "🇦🇺" },
  { name: "Germany",        iso2: "DE", dialCode: "+49",  minLength: 10, maxLength: 11, currency: "EUR", flag: "🇩🇪" },
  { name: "France",         iso2: "FR", dialCode: "+33",  minLength: 9,  maxLength: 9,  currency: "EUR", flag: "🇫🇷" },
  { name: "Italy",          iso2: "IT", dialCode: "+39",  minLength: 9,  maxLength: 10, currency: "EUR", flag: "🇮🇹" },
  { name: "Spain",          iso2: "ES", dialCode: "+34",  minLength: 9,  maxLength: 9,  currency: "EUR", flag: "🇪🇸" },
  { name: "Netherlands",    iso2: "NL", dialCode: "+31",  minLength: 9,  maxLength: 9,  currency: "EUR", flag: "🇳🇱" },
  { name: "Switzerland",    iso2: "CH", dialCode: "+41",  minLength: 9,  maxLength: 9,  currency: "CHF", flag: "🇨🇭" },
  { name: "Japan",          iso2: "JP", dialCode: "+81",  minLength: 10, maxLength: 10, currency: "JPY", flag: "🇯🇵" },
  { name: "China",          iso2: "CN", dialCode: "+86",  minLength: 11, maxLength: 11, currency: "CNY", flag: "🇨🇳" },
  { name: "Hong Kong",      iso2: "HK", dialCode: "+852", minLength: 8,  maxLength: 8,  currency: "HKD", flag: "🇭🇰" },
  { name: "Singapore",      iso2: "SG", dialCode: "+65",  minLength: 8,  maxLength: 8,  currency: "SGD", flag: "🇸🇬" },
  { name: "New Zealand",    iso2: "NZ", dialCode: "+64",  minLength: 8,  maxLength: 10, currency: "NZD", flag: "🇳🇿" },
  { name: "Sweden",         iso2: "SE", dialCode: "+46",  minLength: 7,  maxLength: 9,  currency: "SEK", flag: "🇸🇪" },
  { name: "Norway",         iso2: "NO", dialCode: "+47",  minLength: 8,  maxLength: 8,  currency: "NOK", flag: "🇳🇴" },
  { name: "Denmark",        iso2: "DK", dialCode: "+45",  minLength: 8,  maxLength: 8,  currency: "DKK", flag: "🇩🇰" },
  { name: "Turkey",         iso2: "TR", dialCode: "+90",  minLength: 10, maxLength: 10, currency: "TRY", flag: "🇹🇷" },
  { name: "Russia",         iso2: "RU", dialCode: "+7",   minLength: 10, maxLength: 10, currency: "RUB", flag: "🇷🇺" },
  { name: "Brazil",         iso2: "BR", dialCode: "+55",  minLength: 10, maxLength: 11, currency: "BRL", flag: "🇧🇷" },
  { name: "South Africa",   iso2: "ZA", dialCode: "+27",  minLength: 9,  maxLength: 9,  currency: "ZAR", flag: "🇿🇦" },
  { name: "UAE",            iso2: "AE", dialCode: "+971", minLength: 9,  maxLength: 9,  currency: "AED", flag: "🇦🇪" },
  { name: "Saudi Arabia",   iso2: "SA", dialCode: "+966", minLength: 9,  maxLength: 9,  currency: "SAR", flag: "🇸🇦" },
  { name: "Mexico",         iso2: "MX", dialCode: "+52",  minLength: 10, maxLength: 10, currency: "MXN", flag: "🇲🇽" },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // India

/** Look up a country by its ISO-2 code (the stable selection key). */
export function getCountryByIso(iso2: string): CountryInfo | undefined {
  return COUNTRIES.find((c) => c.iso2 === iso2.toUpperCase());
}

/**
 * First country that uses the given currency code — used to pre-select a
 * sensible country based on the app's active currency.
 */
export function getCountryByCurrency(currency: string): CountryInfo | undefined {
  return COUNTRIES.find((c) => c.currency === currency.toUpperCase());
}

/** Strip everything but digits from a raw phone string. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validate the national number length against the selected country's rules.
 * Returns null when valid, or a human-readable error message when not.
 */
export function validatePhone(iso2: string, nationalNumber: string): string | null {
  const country = getCountryByIso(iso2) ?? DEFAULT_COUNTRY;
  const digits = digitsOnly(nationalNumber);

  if (digits.length === 0) return "Phone number is required.";

  if (country.minLength === country.maxLength) {
    if (digits.length !== country.maxLength) {
      return `${country.name} numbers must be exactly ${country.maxLength} digits.`;
    }
  } else if (digits.length < country.minLength || digits.length > country.maxLength) {
    return `${country.name} numbers must be ${country.minLength}–${country.maxLength} digits.`;
  }

  return null;
}

/** Build the full E.164-style number, e.g. "+919876543210". */
export function toFullNumber(iso2: string, nationalNumber: string): string {
  const country = getCountryByIso(iso2) ?? DEFAULT_COUNTRY;
  return `${country.dialCode}${digitsOnly(nationalNumber)}`;
}
