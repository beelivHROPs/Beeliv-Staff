/**
 * SAMPLE CONTENT. Suggestion chips for the vacancy form's one-per-line fields
 * and the experience-summary templates. Curated by role family for the mock
 * only; Beeliv will later edit this library in Lists and Rules (not built).
 * Matching is by keyword on the position, job title and department text,
 * falling back to the general hospitality set.
 */

export type SuggestionField = "skills" | "responsibilities" | "essential" | "preferred";

type Family = {
  id: string;
  keywords: string[];
  setting: string; // reads after "in", e.g. "a busy restaurant or hotel"
  skills: string[];
  responsibilities: string[];
  essential: string[];
  preferred: string[];
};

const GENERAL: Family = {
  id: "general",
  keywords: [],
  setting: "a busy restaurant, hotel or lounge",
  skills: ["Guest service", "Teamwork", "Communication", "Cash handling", "Food safety and hygiene", "Conflict handling", "Opening and closing procedures", "Time management", "Menu knowledge", "Upselling"],
  responsibilities: ["Greet and look after guests", "Follow Beeliv and client service standards", "Keep the work area clean and tidy", "Report issues to the supervisor", "Support teammates during busy periods"],
  essential: ["Friendly, professional manner", "Able to work shifts, weekends and holidays", "Neat, presentable appearance", "Good spoken English"],
  preferred: ["Hospitality certificate or training", "Experience in a similar venue", "Second language"],
};

const FAMILIES: Family[] = [
  {
    id: "service",
    keywords: ["waiter", "waitress", "server", "steward"],
    setting: "a busy restaurant or hotel",
    skills: ["Guest service", "Table service / silver service", "Menu knowledge", "Upselling", "POS and cashiering", "Food safety and hygiene", "Conflict handling", "Cash handling", "Opening and closing procedures", "Teamwork"],
    responsibilities: ["Welcome guests and take orders accurately", "Serve food and drinks to the standard", "Present the bill and process payment", "Reset tables and keep the section clean", "Handle guest requests and complaints politely"],
    essential: ["Previous restaurant or hotel service experience", "Knowledge of table setting and service order", "Able to stand and carry for long shifts"],
    preferred: ["Food handler certificate", "POS system experience", "Wine and beverage knowledge"],
  },
  {
    id: "bar",
    keywords: ["bartender", "bar attendant", "barman", "barista", "mixolog", "lounge"],
    setting: "a high-volume bar or lounge",
    skills: ["Cocktail and bar basics", "Barista skills", "POS and cashiering", "Cash handling", "Stock control", "Upselling", "Guest service", "Responsible alcohol service", "Food safety and hygiene", "Conflict handling"],
    responsibilities: ["Prepare and serve drinks to the recipe", "Keep the bar stocked, clean and organised", "Count stock and report shortages", "Process payments accurately", "Check guests are served responsibly"],
    essential: ["Bar or beverage service experience", "Knowledge of classic cocktails and spirits", "Honest and reliable with cash and stock"],
    preferred: ["Bartending or barista course", "Flair or mixology skills", "Experience with inventory counts"],
  },
  {
    id: "kitchen",
    keywords: ["chef", "cook", "kitchen", "commis", "baker", "pastry"],
    setting: "a busy restaurant or hotel kitchen",
    skills: ["Knife skills", "Kitchen sanitation", "Food safety and hygiene", "Recipe costing", "Stock control", "Menu knowledge", "Teamwork", "Time management", "Team leadership", "Opening and closing procedures"],
    responsibilities: ["Prepare dishes to the recipe and plating standard", "Keep the station clean and organised", "Follow food safety and storage rules", "Check deliveries and rotate stock", "Report waste and shortages"],
    essential: ["Professional kitchen experience", "Knowledge of food safety and hygiene", "Able to work under pressure"],
    preferred: ["Culinary diploma or certificate", "Experience with Nigerian and continental dishes", "Food handler certificate"],
  },
  {
    id: "front-desk",
    keywords: ["front desk", "reception", "concierge", "guest relations", "front office"],
    setting: "a hotel front desk or reception",
    skills: ["Guest service", "Check-in and check-out", "Reservations handling", "Communication", "Cash handling", "Conflict handling", "Computer skills", "Phone etiquette", "Upselling", "Report writing"],
    responsibilities: ["Check guests in and out", "Answer calls and emails promptly", "Manage bookings and room status", "Handle payments and receipts", "Pass on shift handover notes"],
    essential: ["Front desk or reception experience", "Good written and spoken English", "Comfortable with computers"],
    preferred: ["Hotel software experience", "Second language", "Hospitality certificate"],
  },
  {
    id: "supervisor",
    keywords: ["supervisor", "manager", "head ", "team lead", "captain", "coordinator"],
    setting: "a supervisory role in a restaurant or hotel",
    skills: ["Team leadership", "Rostering", "Conflict handling", "Stock control", "Guest service", "Cash handling", "Training and coaching", "Reporting", "Opening and closing procedures", "Service standards"],
    responsibilities: ["Lead and brief the shift team", "Prepare the roster and track attendance", "Coach staff and give feedback", "Handle escalated guest issues", "Complete shift and cash reports"],
    essential: ["Previous supervisory experience in hospitality", "Able to lead a team on shift", "Strong people and problem-solving skills"],
    preferred: ["Management or hospitality diploma", "Experience with rostering tools", "Training experience"],
  },
  {
    id: "host",
    keywords: ["host", "hostess", "greeter", "usher"],
    setting: "a busy restaurant or event venue",
    skills: ["Guest service", "Reservations handling", "Communication", "Conflict handling", "Menu knowledge", "Phone etiquette", "Teamwork", "Time management"],
    responsibilities: ["Greet and seat guests", "Manage reservations and waiting lists", "Balance seating across sections", "Answer phone enquiries", "Thank guests as they leave"],
    essential: ["Warm, confident manner", "Neat, presentable appearance", "Calm when the venue is busy"],
    preferred: ["Restaurant or event experience", "Reservation software experience"],
  },
  {
    id: "cleaner",
    keywords: ["clean", "housekeep", "janitor", "laundry", "room attendant", "porter"],
    setting: "a hotel or large venue",
    skills: ["Kitchen sanitation", "Housekeeping standards", "Laundry handling", "Chemical safety", "Time management", "Attention to detail", "Teamwork"],
    responsibilities: ["Clean rooms and public areas to standard", "Restock supplies and linen", "Use cleaning chemicals safely", "Report damage and lost property", "Follow the daily cleaning checklist"],
    essential: ["Honest and reliable", "Attention to detail", "Able to stand and lift for long shifts"],
    preferred: ["Hotel housekeeping experience", "Knowledge of cleaning chemicals"],
  },
  {
    id: "security",
    keywords: ["security", "guard", "gateman", "surveillance"],
    setting: "a hotel, lounge or event venue",
    skills: ["Access control", "Incident reporting", "Conflict handling", "Patrol procedures", "Emergency response", "Communication", "Guest service"],
    responsibilities: ["Control entry and check visitors", "Patrol the premises on schedule", "Report incidents in writing", "Respond to alarms and emergencies", "Keep the logbook up to date"],
    essential: ["Security experience", "Alert, calm and disciplined", "Able to work nights and weekends"],
    preferred: ["Security training certificate", "First aid training"],
  },
];

/** Match on position/title first (most specific), then department. */
export function familyFor(...texts: string[]): Family {
  for (const t of texts) {
    const hay = ` ${t.toLowerCase()} `;
    const hit = FAMILIES.find((f) => f.keywords.some((k) => hay.includes(k)));
    if (hit) return hit;
  }
  return GENERAL;
}

export function suggestionsFor(field: SuggestionField, ...texts: string[]): string[] {
  const fam = familyFor(...texts);
  const own = fam[field];
  if (fam === GENERAL || field !== "skills") return own;
  // Role-specific first, then general skills to fill out the list.
  return [...own, ...GENERAL.skills.filter((s) => !own.includes(s))];
}

/** One-line experience summaries from the entered years and role. Always three. */
export function experienceTemplates(minYears: number, maxYears: number | null, ...texts: string[]): string[] {
  const fam = familyFor(...texts);
  if (minYears <= 0) {
    return ["Entry level welcome: training provided", `Some exposure to ${fam.setting} is an advantage`, "Fresh graduates and career changers welcome"];
  }
  const yrs = maxYears && maxYears > minYears ? `${minYears} to ${maxYears} years` : `${minYears}+ years`;
  return [
    `${yrs} in ${fam.setting}`,
    `At least ${minYears} ${minYears === 1 ? "year" : "years"} of hands-on experience in a similar role`,
    `Previous experience in ${fam.setting}, ${minYears}+ years preferred`,
  ];
}

/* ---- Grouped suggestions (chips are shown under small category headings) ---- */

export type SuggestionGroup = { category: string; items: string[] };

const SKILL_CATEGORY: Record<string, string> = {
  "Guest service": "Service", "Table service / silver service": "Service", "Menu knowledge": "Service", "Upselling": "Service",
  "Check-in and check-out": "Service", "Reservations handling": "Service", "Phone etiquette": "Service",
  "Cocktail and bar basics": "Bar", "Barista skills": "Bar", "Responsible alcohol service": "Bar", "Stock control": "Bar",
  "Knife skills": "Kitchen", "Kitchen sanitation": "Kitchen", "Food safety and hygiene": "Kitchen", "Recipe costing": "Kitchen",
  "Housekeeping standards": "Kitchen", "Laundry handling": "Kitchen", "Chemical safety": "Kitchen",
  "Team leadership": "Management", "Rostering": "Management", "Training and coaching": "Management", "Reporting": "Management",
  "Report writing": "Management", "Service standards": "Management", "Incident reporting": "Management",
};
const SKILL_ORDER = ["Service", "Bar", "Kitchen", "Management", "General"];

/** Suggestions split into categories. Skills use a topic map; other fields split into "For this role" and "General". */
export function groupedSuggestionsFor(field: SuggestionField, ...texts: string[]): SuggestionGroup[] {
  const items = suggestionsFor(field, ...texts);
  if (field === "skills") {
    const by = new Map<string, string[]>();
    for (const i of items) {
      const c = SKILL_CATEGORY[i] ?? "General";
      by.set(c, [...(by.get(c) ?? []), i]);
    }
    // Biggest topic first (the role's own), General always last.
    return SKILL_ORDER.filter((c) => by.has(c))
      .map((category) => ({ category, items: by.get(category)! }))
      .sort((a, b) => (a.category === "General" ? 1 : b.category === "General" ? -1 : b.items.length - a.items.length));
  }
  const fam = familyFor(...texts);
  if (fam === GENERAL) return [{ category: "General", items }];
  const general = GENERAL[field].filter((g) => !items.some((i) => i.toLowerCase() === g.toLowerCase()));
  return [{ category: "For this role", items }, ...(general.length ? [{ category: "General", items: general }] : [])];
}
