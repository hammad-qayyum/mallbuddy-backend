import { z } from "zod";

// Only `q` is required. Search type and mall filtering are handled by backend heuristics.
export const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
