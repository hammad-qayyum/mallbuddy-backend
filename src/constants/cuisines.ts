// Canonical hardcoded cuisine list. Source of truth for both mobile apps,
// fetched via GET /cuisines/list. Restaurants store a subset of these strings
// in Restaurant.cuisines (String[]); writes are validated to ensure every
// value is present here.
//
// To add or rename a cuisine, edit this list. No DB migration required.
export const CUISINES = [
  "Arabic",
  "Lebanese",
  "Turkish",
  "Indian",
  "Pakistani",
  "Chinese",
  "Japanese",
  "Italian",
  "American",
  "Mexican",
  "Mediterranean",
  "Continental",
  "Seafood",
  "Fast Food",
  "Healthy",
  "Desserts",
  "Cafe",
] as const;

export type Cuisine = (typeof CUISINES)[number];

const CUISINE_SET = new Set<string>(CUISINES);

export function isValidCuisine(value: unknown): value is Cuisine {
  return typeof value === "string" && CUISINE_SET.has(value);
}

// Returns the unknown entries from the input array; empty array means valid.
export function findUnknownCuisines(values: unknown): string[] {
  if (!Array.isArray(values)) return ["<not an array>"];
  return values.filter((v) => !isValidCuisine(v)) as string[];
}
