"use client";

import React from "react";
import { COUNTRIES, getCountryByIso, digitsOnly } from "@/core/utils/countries";

interface PhoneNumberInputProps {
  /** Selected country ISO-2 code (e.g. "IN"). */
  country: string;
  onCountryChange: (iso2: string) => void;
  /** National number (digits only, without the dial code). */
  value: string;
  onChange: (nationalNumber: string) => void;
  /** Validation message to show beneath the field, if any. */
  error?: string | null;
  id?: string;
}

/**
 * Country-aware phone entry: a country selector (flag + dial code + currency)
 * paired with a number field that enforces the selected country's digit limit.
 * Stores only the national number; combine with the dial code at submit time
 * via toFullNumber().
 */
export default function PhoneNumberInput({
  country,
  onCountryChange,
  value,
  onChange,
  error,
  id = "phone",
}: PhoneNumberInputProps) {
  const selected = getCountryByIso(country) ?? COUNTRIES[0];

  const handleNumberChange = (raw: string) => {
    // Keep digits only and never allow more than the country's max length.
    onChange(digitsOnly(raw).slice(0, selected.maxLength));
  };

  const lengthHint =
    selected.minLength === selected.maxLength
      ? `${selected.maxLength} digits`
      : `${selected.minLength}–${selected.maxLength} digits`;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {/* Country selector */}
        <div className="relative shrink-0">
          <select
            aria-label="Country"
            value={selected.iso2}
            onChange={(e) => {
              onCountryChange(e.target.value);
              // Re-clamp the existing number to the new country's max length.
              onChange(digitsOnly(value).slice(0, getCountryByIso(e.target.value)?.maxLength ?? 15));
            }}
            className="input-base h-full pr-7 pl-3 font-bold cursor-pointer appearance-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.flag} {c.dialCode} · {c.currency}
              </option>
            ))}
          </select>
        </div>

        {/* National number */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-foreground-muted pointer-events-none">
            {selected.dialCode}
          </span>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={(e) => handleNumberChange(e.target.value)}
            maxLength={selected.maxLength}
            className="input-base w-full pl-12"
            placeholder={"".padStart(selected.maxLength, "0")}
            required
          />
        </div>
      </div>

      <p className={`text-[10px] ${error ? "text-error font-bold" : "text-foreground-muted"}`}>
        {error
          ? error
          : `${selected.name} numbers are ${lengthHint}. Billing currency: ${selected.currency}.`}
      </p>
    </div>
  );
}
