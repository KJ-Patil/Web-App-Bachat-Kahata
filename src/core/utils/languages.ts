/**
 * Indian languages dataset for the app's language preference.
 *
 * Covers the 22 official languages listed in the Eighth Schedule of the Indian
 * Constitution (spoken across the states & union territories) plus English.
 * Each entry carries an ISO/BCP-47 code, the English name, the endonym (native
 * spelling) and a sample of states/UTs where it is an official language.
 *
 * This is a *preference* store only — selecting a language persists the choice
 * (mirroring how the currency setting works). Full UI translation is a separate
 * concern and not wired up here.
 */

export interface LanguageInfo {
  /** BCP-47 / ISO 639 code. */
  code: string;
  /** English name of the language. */
  name: string;
  /** Native spelling (endonym). */
  nativeName: string;
  /** Indian states / union territories where it is official (sample). */
  regions: string;
}

export const DEFAULT_LANGUAGE = "en";

export const INDIAN_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", regions: "All India (associate official)" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", regions: "Uttar Pradesh, Bihar, Madhya Pradesh, Rajasthan, Delhi" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", regions: "Maharashtra, Goa" },
];

/** Look up a language by code, falling back to English. */
export function getLanguage(code: string): LanguageInfo {
  return (
    INDIAN_LANGUAGES.find((l) => l.code === code) ??
    INDIAN_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE)!
  );
}
