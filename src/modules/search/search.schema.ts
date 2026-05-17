import { z } from "zod";

// `q` is required. `mallId` is optional — when provided, results are scoped
// to restaurants in that mall (otherwise the search is global).
export const searchQuerySchema = z.object({
  q: z.string().min(1),
  mallId: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
