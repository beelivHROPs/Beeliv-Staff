/**
 * Starter job-photo library for the public job card (PROPOSAL: the set, the
 * department mapping and the file rules need Beeliv confirmation).
 *
 * `file: null` = a slot reserved for a future starter photo. Nothing is
 * invented or hotlinked: a slot without a file renders the branded neutral
 * cover (soft purple with a line icon), never a broken image. To add a photo,
 * drop the file into public/images/jobs and set `file`.
 * Target format for new photos: JPG/WebP, about 4:3 (1200 x 900), no client
 * logo, consent on file for any identifiable person.
 */
import type { VacancyImage } from "./types";

export interface LibraryPhoto {
  id: string;
  /** Shown under the thumbnail and on the fallback tile. */
  label: string;
  file: string | null;
  /** Default alt text if HR does not write their own. */
  describe: string;
}

export const JOB_PHOTO_LIBRARY: LibraryPhoto[] = [
  { id: "kitchen", label: "Kitchen", file: "head-chef.jpg", describe: "Chef plating a dish" },
  { id: "front-of-house", label: "Front of house", file: "guest-relations-officer.jpg", describe: "Host welcoming guests" },
  { id: "bar", label: "Bar", file: "bar-supervisor.jpg", describe: "Bartender pouring a cocktail" },
  { id: "management", label: "Management", file: "restaurant-supervisor.jpg", describe: "Supervisor setting a table" },
  { id: "reception", label: "Reception", file: "receptionist-extra.jpg", describe: "Receptionist at the front desk" },
  { id: "housekeeping", label: "Housekeeping", file: null, describe: "Housekeeping team member" },
  { id: "admin", label: "Admin", file: null, describe: "Operations officer at a laptop" },
  { id: "support", label: "Support", file: null, describe: "Support team member" },
  { id: "general", label: "General", file: null, describe: "Hospitality team member" },
];

/** Department (from the adapter's config) -> library id. Unmapped departments fall back to the neutral cover. */
const DEPARTMENT_DEFAULT: Record<string, string> = {
  Kitchen: "kitchen",
  "Front of house": "front-of-house",
  Bar: "bar",
  Management: "management",
  "Admin & operations": "admin",
  Support: "support",
};

export const libraryById = (id: string): LibraryPhoto | undefined => JOB_PHOTO_LIBRARY.find((p) => p.id === id);
export const photoSrc = (p: LibraryPhoto | undefined): string | null => (p?.file ? `/images/jobs/${p.file}` : null);

/** The automatic photo for a department. `src: null` = use the branded neutral cover. */
export function defaultPhotoFor(department: string): { entry: LibraryPhoto | undefined; src: string | null } {
  const entry = libraryById(DEPARTMENT_DEFAULT[department] ?? "");
  return { entry, src: photoSrc(entry) };
}

/** What the card should show for a vacancy's image choice. `src: null` = branded neutral cover. */
export function resolveJobPhoto(image: VacancyImage | undefined | null, department: string, fallbackAlt: string): { src: string | null; alt: string } {
  const alt = image?.alt.trim() || fallbackAlt;
  if (image?.source === "upload" && image.ref) return { src: image.ref, alt };
  if (image?.source === "library") return { src: photoSrc(libraryById(image.ref)), alt };
  return { src: defaultPhotoFor(department).src, alt };
}
