/**
 * Country table for the shared country-code phone input.
 *
 * Presentation helper only: the SERVER stays the authority on what a phone number is
 * (docs/contracts/account-uniqueness.md). The lengths below are the national
 * significant number WITHOUT the leading trunk 0 (e.g. Nigeria 0801 234 5678 is 10
 * digits). Where a range is not well known, the default (6 to 14) is used and the
 * overall rule (country code + number, 8 to 15 digits in total) still applies.
 *
 * No flag emoji (Windows does not render them): the UI shows the ISO2 code instead.
 * No dependency (no libphonenumber): this is a deliberately small table.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, e.g. "NG". */
  iso: string;
  name: string;
  /** Dial code digits, no "+", e.g. "234". */
  dial: string;
  /** Example national number, grouped the way people read it (also drives the display grouping). */
  example: string;
  /** Fewest / most national digits (no trunk 0). */
  min: number;
  max: number;
  /** National number keeps its leading 0 after the country code (Italy). */
  keepZero?: boolean;
  /** Shares its dial code with a bigger country: never picked when detecting from "+1..." alone. */
  shared?: boolean;
  /** Extra check on the national digits (no trunk 0), with the plain-language error. */
  pattern?: { test: RegExp; message: string };
};

/** [iso, name, dial, example, min, max, flags?] */
type Row = [string, string, string, string, number, number, ("keepZero" | "shared")?];

const NG_PATTERN = {
  test: /^(70|71|80|81|90|91)\d{8}$/,
  message: "Nigerian mobile numbers start with 070, 080, 081, 090 or 091.",
};

const ROWS: Row[] = [
  // Africa
  ["DZ", "Algeria", "213", "551 23 45 67", 9, 9],
  ["AO", "Angola", "244", "923 456 789", 9, 9],
  ["BJ", "Benin", "229", "01 97 12 34 56", 8, 10],
  ["BW", "Botswana", "267", "71 234 567", 7, 8],
  ["BF", "Burkina Faso", "226", "70 12 34 56", 8, 8],
  ["BI", "Burundi", "257", "79 56 12 34", 8, 8],
  ["CM", "Cameroon", "237", "671 23 45 67", 9, 9],
  ["CV", "Cape Verde", "238", "991 12 34", 7, 7],
  ["CF", "Central African Republic", "236", "70 01 23 45", 8, 8],
  ["TD", "Chad", "235", "63 01 23 45", 8, 8],
  ["KM", "Comoros", "269", "321 23 45", 7, 7],
  ["CG", "Congo (Republic)", "242", "06 123 4567", 9, 9],
  ["CD", "Congo (DR)", "243", "991 234 567", 9, 9],
  ["CI", "Cote d'Ivoire", "225", "01 23 45 67 89", 10, 10],
  ["DJ", "Djibouti", "253", "77 83 10 01", 8, 8],
  ["EG", "Egypt", "20", "100 123 4567", 9, 10],
  ["GQ", "Equatorial Guinea", "240", "222 123 456", 9, 9],
  ["ER", "Eritrea", "291", "7 123 456", 7, 7],
  ["SZ", "Eswatini", "268", "7612 3456", 8, 8],
  ["ET", "Ethiopia", "251", "91 123 4567", 9, 9],
  ["GA", "Gabon", "241", "06 03 12 34", 7, 8],
  ["GM", "Gambia", "220", "301 2345", 7, 7],
  ["GH", "Ghana", "233", "20 123 4567", 9, 9],
  ["GN", "Guinea", "224", "601 12 34 56", 9, 9],
  ["GW", "Guinea-Bissau", "245", "955 012 345", 7, 9],
  ["KE", "Kenya", "254", "712 345 678", 9, 9],
  ["LS", "Lesotho", "266", "5012 3456", 8, 8],
  ["LR", "Liberia", "231", "77 012 3456", 7, 9],
  ["LY", "Libya", "218", "91 234 5678", 9, 10],
  ["MG", "Madagascar", "261", "32 12 345 67", 9, 9],
  ["MW", "Malawi", "265", "991 23 45 67", 7, 9],
  ["ML", "Mali", "223", "65 01 23 45", 8, 8],
  ["MR", "Mauritania", "222", "22 12 34 56", 8, 8],
  ["MU", "Mauritius", "230", "5251 2345", 7, 8],
  ["MA", "Morocco", "212", "650 123 456", 9, 9],
  ["MZ", "Mozambique", "258", "82 123 4567", 9, 9],
  ["NA", "Namibia", "264", "81 123 4567", 8, 9],
  ["NE", "Niger", "227", "93 12 34 56", 8, 8],
  ["NG", "Nigeria", "234", "801 234 5678", 10, 10],
  ["RW", "Rwanda", "250", "788 123 456", 9, 9],
  ["ST", "Sao Tome and Principe", "239", "981 2345", 7, 7],
  ["SN", "Senegal", "221", "77 123 45 67", 9, 9],
  ["SC", "Seychelles", "248", "2 510 123", 7, 7],
  ["SL", "Sierra Leone", "232", "25 123456", 8, 8],
  ["SO", "Somalia", "252", "7 1123456", 7, 9],
  ["ZA", "South Africa", "27", "71 123 4567", 9, 9],
  ["SS", "South Sudan", "211", "977 123 456", 9, 9],
  ["SD", "Sudan", "249", "91 123 4567", 9, 9],
  ["TZ", "Tanzania", "255", "621 234 567", 9, 9],
  ["TG", "Togo", "228", "90 11 23 45", 8, 8],
  ["TN", "Tunisia", "216", "20 123 456", 8, 8],
  ["UG", "Uganda", "256", "712 345 678", 9, 9],
  ["ZM", "Zambia", "260", "95 5123456", 9, 9],
  ["ZW", "Zimbabwe", "263", "71 234 5678", 9, 10],

  // United Kingdom, Ireland, North America
  ["GB", "United Kingdom", "44", "7911 123456", 9, 10],
  ["IE", "Ireland", "353", "85 012 3456", 7, 9],
  ["US", "United States", "1", "415 555 2671", 10, 10],
  ["CA", "Canada", "1", "506 234 5678", 10, 10, "shared"],

  // Gulf and wider Middle East
  ["AE", "United Arab Emirates", "971", "50 123 4567", 9, 9],
  ["SA", "Saudi Arabia", "966", "51 234 5678", 9, 9],
  ["QA", "Qatar", "974", "3312 3456", 8, 8],
  ["KW", "Kuwait", "965", "500 12345", 8, 8],
  ["BH", "Bahrain", "973", "3600 1234", 8, 8],
  ["OM", "Oman", "968", "9212 3456", 8, 8],
  ["JO", "Jordan", "962", "7 9012 3456", 8, 9],
  ["LB", "Lebanon", "961", "71 123 456", 7, 8],
  ["IL", "Israel", "972", "50 123 4567", 8, 9],
  ["TR", "Turkey", "90", "501 234 5678", 10, 10],

  // Asia and Pacific
  ["IN", "India", "91", "81234 56789", 10, 10],
  ["PK", "Pakistan", "92", "301 2345678", 10, 10],
  ["BD", "Bangladesh", "880", "1812 345678", 10, 10],
  ["LK", "Sri Lanka", "94", "71 234 5678", 9, 9],
  ["NP", "Nepal", "977", "984 123 4567", 10, 10],
  ["CN", "China", "86", "131 2345 6789", 10, 11],
  ["HK", "Hong Kong", "852", "5123 4567", 8, 8],
  ["JP", "Japan", "81", "90 1234 5678", 9, 10],
  ["KR", "South Korea", "82", "10 1234 5678", 9, 10],
  ["SG", "Singapore", "65", "8123 4567", 8, 8],
  ["MY", "Malaysia", "60", "12 345 6789", 9, 10],
  ["ID", "Indonesia", "62", "812 3456 789", 9, 12],
  ["PH", "Philippines", "63", "917 123 4567", 10, 10],
  ["TH", "Thailand", "66", "81 234 5678", 9, 9],
  ["VN", "Vietnam", "84", "91 234 56 78", 9, 10],
  ["AU", "Australia", "61", "412 345 678", 9, 9],
  ["NZ", "New Zealand", "64", "21 123 4567", 8, 10],

  // Europe
  ["DE", "Germany", "49", "1512 3456789", 7, 13],
  ["FR", "France", "33", "6 12 34 56 78", 9, 9],
  ["ES", "Spain", "34", "612 34 56 78", 9, 9],
  ["IT", "Italy", "39", "312 345 6789", 6, 11, "keepZero"],
  ["NL", "Netherlands", "31", "6 12345678", 9, 9],
  ["BE", "Belgium", "32", "470 12 34 56", 8, 9],
  ["PT", "Portugal", "351", "912 345 678", 9, 9],
  ["CH", "Switzerland", "41", "78 123 45 67", 9, 9],
  ["AT", "Austria", "43", "664 123 4567", 7, 13],
  ["SE", "Sweden", "46", "70 123 45 67", 7, 10],
  ["NO", "Norway", "47", "412 34 567", 8, 8],
  ["DK", "Denmark", "45", "32 12 34 56", 8, 8],
  ["FI", "Finland", "358", "41 234 5678", 6, 10],
  ["PL", "Poland", "48", "512 345 678", 9, 9],
  ["GR", "Greece", "30", "691 234 5678", 10, 10],
  ["RU", "Russia", "7", "912 345 6789", 10, 10],
  ["UA", "Ukraine", "380", "50 123 4567", 9, 9],

  // Americas
  ["BR", "Brazil", "55", "11 91234 5678", 10, 11],
  ["MX", "Mexico", "52", "222 123 4567", 10, 10],
  ["AR", "Argentina", "54", "11 2345 6789", 10, 11],
  ["CO", "Colombia", "57", "321 1234567", 10, 10],
  ["JM", "Jamaica", "1876", "210 1234", 7, 7],
];

export const DEFAULT_ISO = "NG";

/** Shown right after Nigeria (project lead: "common for Beeliv"). */
const COMMON_ISO = ["GH", "KE", "ZA", "GB", "US", "AE", "CM", "BJ", "TG", "SL"] as const;

export const COUNTRIES: Country[] = ROWS.map(([iso, name, dial, example, min, max, flag]) => ({
  iso,
  name,
  dial,
  example,
  min,
  max,
  ...(flag === "keepZero" ? { keepZero: true } : {}),
  ...(flag === "shared" ? { shared: true } : {}),
  ...(iso === "NG" ? { pattern: NG_PATTERN } : {}),
}));

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function getCountry(iso: string | undefined | null): Country {
  return BY_ISO.get((iso ?? "").toUpperCase()) ?? BY_ISO.get(DEFAULT_ISO)!;
}

export function hasCountry(iso: string): boolean {
  return BY_ISO.has(iso.toUpperCase());
}

/** Nigeria, then the "common for Beeliv" group, then everyone else A to Z. */
export const COUNTRY_GROUPS: { id: string; label: string | null; countries: Country[] }[] = (() => {
  const nigeria = getCountry("NG");
  const common = COMMON_ISO.map((i) => getCountry(i));
  const used = new Set<string>([nigeria.iso, ...common.map((c) => c.iso)]);
  const rest = COUNTRIES.filter((c) => !used.has(c.iso)).sort((a, b) => a.name.localeCompare(b.name));
  return [
    { id: "default", label: null, countries: [nigeria] },
    { id: "common", label: "Common for Beeliv", countries: common },
    { id: "all", label: "All countries", countries: rest },
  ];
})();

/** Dial codes, longest first, so "+233..." never matches a shorter code by accident. */
const DIALS = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length || a.localeCompare(b));

/**
 * Longest dial-code match at the start of `digits` (no "+"). When several countries
 * share the code, the hinted one wins, then the non-"shared" one (US, not Canada).
 */
export function detectCountry(digits: string, hintIso?: string): Country | null {
  const dial = DIALS.find((d) => digits.startsWith(d));
  if (!dial) return null;
  const same = COUNTRIES.filter((c) => c.dial === dial);
  return same.find((c) => c.iso === (hintIso ?? "").toUpperCase()) ?? same.find((c) => !c.shared) ?? same[0];
}

/** Search by country name, dial code ("+233" or "233") or ISO2 code. Empty query = everything. */
export function matchesCountry(c: Country, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^\+/, "");
  if (!q) return true;
  return c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.iso.toLowerCase().startsWith(q) || c.dial.startsWith(q);
}
