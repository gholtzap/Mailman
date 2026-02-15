import { z } from "zod";

export const apiKeySchema = z.object({
  apiKey: z
    .string({ error: "Invalid API key format" })
    .refine((val) => val.startsWith("sk-ant-"), "Invalid API key format"),
});

export const settingsUpdateSchema = z.object({
  defaultCategories: z.array(z.string()).optional(),
  maxPagesPerPaper: z.number().optional(),
  papersPerCategory: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  keywordMatchMode: z
    .enum(["any", "all"], { error: "keywordMatchMode must be 'any' or 'all'" })
    .optional(),
  email: z
    .union([
      z.literal(""),
      z.string().refine((e) => e.includes("@"), "Invalid email address"),
    ])
    .optional(),
});

export const batchCompletionEmailSchema = z.object({
  jobId: z.string({ error: "jobId is required" }).min(1, "jobId is required"),
  scheduleId: z.string().optional(),
});
