import { z } from "zod";

export const processingSingleSchema = z.object({
  paperId: z.string(),
  skipAI: z.boolean().optional(),
});

export const processingBatchSchema = z.object({
  categories: z.array(z.string()).optional(),
  papersPerCategory: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  keywordMatchMode: z
    .string()
    .refine(
      (val) => ["any", "all"].includes(val),
      "keywordMatchMode must be 'any' or 'all'"
    )
    .optional(),
  skipAI: z.boolean().optional(),
});
