// Shared phone utility — keep one source of truth for country codes
// and validation. Both ProfilePage and BookingPage import from here.

export const COUNTRY_CODES = [
  { code: 'KE', name: 'Kenya', dial: '+254', length: 9, example: '712 345 678' },
  { code: 'UG', name: 'Uganda', dial: '+256', length: 9, example: '712 345 678' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', length: 9, example: '712 345 678' },
  { code: 'RW', name: 'Rwanda', dial: '+250', length: 9, example: '712 345 678' },
  { code: 'US', name: 'United States', dial: '+1', length: 10, example: '212 555 1234' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', length: 10, example: '7123 456 789' },
  { code: 'ZA', name: 'South Africa', dial: '+27', length: 9, example: '71 234 5678' },
  { code: 'NG', name: 'Nigeria', dial: '+234', length: 10, example: '712 345 6789' },
  { code: 'AE', name: 'UAE', dial: '+971', length: 9, example: '50 123 4567' },
  { code: 'IN', name: 'India', dial: '+91', length: 10, example: '71234 56789' },
  { code: 'DE', name: 'Germany', dial: '+49', length: 11, example: '151 234 56789' },
  { code: 'FR', name: 'France', dial: '+33', length: 9, example: '6 12 34 56 78' },
  { code: 'CN', name: 'China', dial: '+86', length: 11, example: '131 2345 6789' },
  { code: 'CA', name: 'Canada', dial: '+1', length: 10, example: '416 555 1234' },
];

/**
 * Strip a phone string down to digits only and validate against a country.
 * Returns { clean, valid, formatted } — valid is a boolean.
 * Accepts local or international format; uses the selected country's expected
 * digit length. If the number starts with the country dial code or "00", that
 * prefix is stripped before length checking.
 */
export function validatePhone(raw, country) {
  if (!raw || !country) return { clean: '', valid: false, formatted: '' };
  let digits = raw.replace(/\D/g, '');
  // Strip the dial code if the user typed it
  const dialDigits = country.dial.replace(/\D/g, '');
  if (digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  } else if (digits.startsWith('00')) {
    // Strip "00" + country code prefix — e.g. "00254" → ""
    const without00 = digits.slice(2);
    if (without00.startsWith(dialDigits)) {
      digits = without00.slice(dialDigits.length);
    }
  }
  const valid = digits.length === country.length;
  return { clean: digits, valid, formatted: country.dial + ' ' + digits };
}

/** Try to detect which country a stored phone number belongs to. */
export function detectCountry(storedPhone) {
  if (!storedPhone) return { countryCode: 'KE', phoneNumber: '' };
  const digits = storedPhone.replace(/\D/g, '');
  // Check dial codes sorted longest-first so +254 trumps +1
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = c.dial.replace(/\D/g, '');
    if (digits.startsWith(dialDigits)) {
      return { countryCode: c.code, phoneNumber: digits.slice(dialDigits.length) };
    }
  }
  // Fallback: treat as local Kenyan number
  return { countryCode: 'KE', phoneNumber: digits };
}
