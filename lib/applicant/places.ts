/**
 * Address suggestions for the Apply / Profile address fields.
 *
 * Two providers behind one typed function, so the UI never knows which ran:
 *  - "google": Google Maps Places (New) Autocomplete, restricted to Nigeria.
 *    Enabled only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set. That key is a
 *    browser key (public by design) — it must be restricted to Beeliv's
 *    domains and the Places API in Google Cloud. It is never committed.
 *  - "local": a small built-in list of well-known Nigerian areas, so the
 *    field still helps when no key is configured (today's prototype).
 *
 * Only the text the applicant types is sent to Google; nothing is stored.
 */
import { NIGERIAN_STATES } from "./reference-data";

export type AddressSuggestion = {
  id: string;
  /** Full text written into the address field when picked. */
  label: string;
  main: string;
  secondary: string;
  /** Matched against NIGERIAN_STATES so the State field can auto-fill. */
  state?: string;
  lga?: string;
};

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const ADDRESS_PROVIDER: "google" | "local" = GOOGLE_KEY ? "google" : "local";

/* ---------------------------------------------------------------- local */

type Area = { area: string; city: string; state: string; lga?: string };

const AREAS: Area[] = [
  { area: "Wuse 2", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Wuse Zone 5", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Maitama", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Garki", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Asokoro", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Jabi", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Utako", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Gwarinpa", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Lugbe", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Kubwa", city: "Abuja", state: "FCT (Abuja)", lga: "Bwari" },
  { area: "Lekki Phase 1", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Victoria Island", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Ikoyi", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Ajah", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Ikeja GRA", city: "Lagos", state: "Lagos", lga: "Ikeja" },
  { area: "Yaba", city: "Lagos", state: "Lagos", lga: "Lagos Mainland" },
  { area: "Surulere", city: "Lagos", state: "Lagos", lga: "Surulere" },
  { area: "Magodo", city: "Lagos", state: "Lagos", lga: "Kosofe" },
  { area: "Festac Town", city: "Lagos", state: "Lagos", lga: "Amuwo-Odofin" },
  { area: "GRA Phase 2", city: "Port Harcourt", state: "Rivers", lga: "Port Harcourt" },
  { area: "Trans-Amadi", city: "Port Harcourt", state: "Rivers", lga: "Obio-Akpor" },
  { area: "Rumuokoro", city: "Port Harcourt", state: "Rivers", lga: "Obio-Akpor" },
  { area: "Bodija", city: "Ibadan", state: "Oyo", lga: "Ibadan North" },
  { area: "Independence Layout", city: "Enugu", state: "Enugu" },
  { area: "GRA", city: "Benin City", state: "Edo" },
  { area: "Nassarawa GRA", city: "Kano", state: "Kano" },
  { area: "Barnawa", city: "Kaduna", state: "Kaduna" },
  { area: "Apo", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Gudu", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Durumi", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Katampe", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Mabushi", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Jahi", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Dawaki", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Lokogoma", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Nyanya", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Mpape", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Karmo", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Life Camp", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Central Business District", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Wuse Zone 1", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Wuse Zone 3", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Wuse Zone 6", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Garki 2", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Area 1", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Area 11", city: "Abuja", state: "FCT (Abuja)", lga: "Abuja Municipal" },
  { area: "Gwagwalada", city: "Abuja", state: "FCT (Abuja)", lga: "Gwagwalada" },
  { area: "Kuje", city: "Abuja", state: "FCT (Abuja)", lga: "Kuje" },
  { area: "Bwari", city: "Abuja", state: "FCT (Abuja)", lga: "Bwari" },
  { area: "Abaji", city: "Abuja", state: "FCT (Abuja)", lga: "Abaji" },
  { area: "Oniru", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Ikota", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Banana Island", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Chevron", city: "Lagos", state: "Lagos", lga: "Eti-Osa" },
  { area: "Ikeja", city: "Lagos", state: "Lagos", lga: "Ikeja" },
  { area: "Oshodi", city: "Lagos", state: "Lagos", lga: "Oshodi-Isolo" },
  { area: "Isolo", city: "Lagos", state: "Lagos", lga: "Oshodi-Isolo" },
  { area: "Mushin", city: "Lagos", state: "Lagos", lga: "Mushin" },
  { area: "Apapa", city: "Lagos", state: "Lagos", lga: "Apapa" },
  { area: "Ojota", city: "Lagos", state: "Lagos", lga: "Kosofe" },
  { area: "Ketu", city: "Lagos", state: "Lagos", lga: "Kosofe" },
  { area: "Ikorodu", city: "Lagos", state: "Lagos", lga: "Ikorodu" },
  { area: "Badagry", city: "Lagos", state: "Lagos", lga: "Badagry" },
  { area: "Epe", city: "Lagos", state: "Lagos", lga: "Epe" },
  { area: "Agege", city: "Lagos", state: "Lagos", lga: "Agege" },
  { area: "Alimosho", city: "Lagos", state: "Lagos", lga: "Alimosho" },
  { area: "Ajegunle", city: "Lagos", state: "Lagos", lga: "Ajeromi-Ifelodun" },
  { area: "Lagos Island", city: "Lagos", state: "Lagos", lga: "Lagos Island" },
  { area: "Maryland", city: "Lagos", state: "Lagos" },
  { area: "Gbagada", city: "Lagos", state: "Lagos" },
  { area: "Ojodu", city: "Lagos", state: "Lagos" },
  { area: "Ogba", city: "Lagos", state: "Lagos" },
  { area: "Old GRA", city: "Port Harcourt", state: "Rivers", lga: "Port Harcourt" },
  { area: "D-Line", city: "Port Harcourt", state: "Rivers", lga: "Port Harcourt" },
  { area: "Diobu", city: "Port Harcourt", state: "Rivers", lga: "Port Harcourt" },
  { area: "Eleme", city: "Port Harcourt", state: "Rivers", lga: "Eleme" },
  { area: "Sabon Gari", city: "Kano", state: "Kano", lga: "Sabon Gari" },
  { area: "Fagge", city: "Kano", state: "Kano", lga: "Fagge" },
  { area: "Bompai", city: "Kano", state: "Kano" },
  { area: "Challenge", city: "Ibadan", state: "Oyo" },
  { area: "Dugbe", city: "Ibadan", state: "Oyo" },
  { area: "Ring Road", city: "Ibadan", state: "Oyo" },
  { area: "Agodi", city: "Ibadan", state: "Oyo" },
  { area: "Umuahia", city: "Umuahia", state: "Abia" },
  { area: "Aba", city: "Aba", state: "Abia" },
  { area: "Yola", city: "Yola", state: "Adamawa" },
  { area: "Uyo", city: "Uyo", state: "Akwa Ibom" },
  { area: "Ikot Ekpene", city: "Ikot Ekpene", state: "Akwa Ibom" },
  { area: "Awka", city: "Awka", state: "Anambra" },
  { area: "Onitsha", city: "Onitsha", state: "Anambra" },
  { area: "Nnewi", city: "Nnewi", state: "Anambra" },
  { area: "Bauchi", city: "Bauchi", state: "Bauchi" },
  { area: "Yenagoa", city: "Yenagoa", state: "Bayelsa" },
  { area: "Makurdi", city: "Makurdi", state: "Benue" },
  { area: "Maiduguri", city: "Maiduguri", state: "Borno" },
  { area: "Calabar", city: "Calabar", state: "Cross River" },
  { area: "Asaba", city: "Asaba", state: "Delta" },
  { area: "Warri", city: "Warri", state: "Delta" },
  { area: "Abakaliki", city: "Abakaliki", state: "Ebonyi" },
  { area: "Benin City", city: "Benin City", state: "Edo" },
  { area: "Ado-Ekiti", city: "Ado-Ekiti", state: "Ekiti" },
  { area: "Enugu", city: "Enugu", state: "Enugu" },
  { area: "Nsukka", city: "Nsukka", state: "Enugu" },
  { area: "Gombe", city: "Gombe", state: "Gombe" },
  { area: "Owerri", city: "Owerri", state: "Imo" },
  { area: "Dutse", city: "Dutse", state: "Jigawa" },
  { area: "Kaduna", city: "Kaduna", state: "Kaduna" },
  { area: "Zaria", city: "Zaria", state: "Kaduna" },
  { area: "Kano", city: "Kano", state: "Kano" },
  { area: "Katsina", city: "Katsina", state: "Katsina" },
  { area: "Birnin Kebbi", city: "Birnin Kebbi", state: "Kebbi" },
  { area: "Lokoja", city: "Lokoja", state: "Kogi" },
  { area: "Okene", city: "Okene", state: "Kogi" },
  { area: "Ilorin", city: "Ilorin", state: "Kwara" },
  { area: "Lafia", city: "Lafia", state: "Nasarawa" },
  { area: "Minna", city: "Minna", state: "Niger" },
  { area: "Suleja", city: "Suleja", state: "Niger" },
  { area: "Abeokuta", city: "Abeokuta", state: "Ogun" },
  { area: "Sagamu", city: "Sagamu", state: "Ogun" },
  { area: "Ijebu-Ode", city: "Ijebu-Ode", state: "Ogun" },
  { area: "Ota", city: "Ota", state: "Ogun" },
  { area: "Akure", city: "Akure", state: "Ondo" },
  { area: "Osogbo", city: "Osogbo", state: "Osun" },
  { area: "Ile-Ife", city: "Ile-Ife", state: "Osun" },
  { area: "Ibadan", city: "Ibadan", state: "Oyo" },
  { area: "Ogbomosho", city: "Ogbomosho", state: "Oyo" },
  { area: "Jos", city: "Jos", state: "Plateau" },
  { area: "Port Harcourt", city: "Port Harcourt", state: "Rivers" },
  { area: "Sokoto", city: "Sokoto", state: "Sokoto" },
  { area: "Jalingo", city: "Jalingo", state: "Taraba" },
  { area: "Damaturu", city: "Damaturu", state: "Yobe" },
  { area: "Gusau", city: "Gusau", state: "Zamfara" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Known areas/junctions for the State -> LGA -> "nearest junction" picker.
 * Matches by state, and narrows by LGA when the built-in list has any area
 * for that LGA. There is no nationwide junction dataset, so for most places
 * this returns [] and the field is simply typed in.
 */
export function junctionSuggestions(state: string, lga: string): string[] {
  const inState = AREAS.filter((a) => a.state === state);
  const inLga = lga ? inState.filter((a) => a.lga && norm(a.lga) === norm(lga)) : [];
  return [...new Set((inLga.length ? inLga : inState).map((a) => a.area))];
}

function localSuggest(input: string): AddressSuggestion[] {
  // "12 Aminu Kano Crescent, Wu" → street part kept, last segment matched.
  const parts = input.split(",");
  const term = parts.pop()!.trim().toLowerCase();
  const street = parts.map((p) => p.trim()).filter(Boolean).join(", ");
  if (term.length < 2) return [];
  return AREAS.filter((a) => `${a.area} ${a.city} ${a.state}`.toLowerCase().includes(term))
    .slice(0, 6)
    .map((a) => {
      const place = a.area === a.city ? a.city : `${a.area}, ${a.city}`;
      return {
        id: `${a.area}-${a.city}`,
        label: street ? `${street}, ${place}` : place,
        main: street ? `${street}, ${a.area}` : a.area,
        secondary: `${a.city}, ${a.state === "FCT (Abuja)" ? "FCT" : `${a.state} State`}`,
        state: a.state,
        lga: a.lga,
      };
    });
}

/* --------------------------------------------------------------- google */

type GText = { text: string };
type GPrediction = { placeId: string; text: GText; mainText?: GText | null; secondaryText?: GText | null };
type GPlacesLib = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(req: {
      input: string;
      includedRegionCodes: string[];
      sessionToken?: object;
    }): Promise<{ suggestions: { placePrediction: GPrediction | null }[] }>;
  };
};
type GWindow = Window & { google?: { maps?: { importLibrary?: (name: "places") => Promise<unknown> } } };

let loading: Promise<GPlacesLib> | null = null;
let session: object | undefined;

function loadPlaces(): Promise<GPlacesLib> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const w = window as GWindow;
    if (w.google?.maps?.importLibrary) return resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&loading=async&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  }).then(async () => {
    const w = window as GWindow;
    const lib = (await w.google!.maps!.importLibrary!("places")) as GPlacesLib;
    return lib;
  });
  loading.catch(() => (loading = null));
  return loading;
}

function stateFrom(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\b(abuja|fct|federal capital)\b/.test(t)) return "FCT (Abuja)";
  return NIGERIAN_STATES.find((s) => new RegExp(`\\b${s.toLowerCase()}\\b`).test(t));
}

async function googleSuggest(input: string): Promise<AddressSuggestion[]> {
  const lib = await loadPlaces();
  session ??= new lib.AutocompleteSessionToken();
  const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedRegionCodes: ["ng"],
    sessionToken: session,
  });
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is GPrediction => !!p)
    .slice(0, 6)
    .map((p) => ({
      id: p.placeId,
      label: p.text.text,
      main: p.mainText?.text ?? p.text.text,
      secondary: p.secondaryText?.text ?? "",
      state: stateFrom(p.text.text),
    }));
}

/* ---------------------------------------------------------------- public */

export async function suggestAddresses(input: string): Promise<AddressSuggestion[]> {
  if (input.trim().length < 2) return [];
  if (ADDRESS_PROVIDER === "google") {
    try {
      return await googleSuggest(input);
    } catch {
      return localSuggest(input);
    }
  }
  return localSuggest(input);
}

/** Call after a suggestion is picked so Google bills the lookups as one session. */
export function endAddressSession() {
  session = undefined;
}
