import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MISSING_REQUIRED = "Missing required fields: name, categories, papersPerCategory";

export const scheduleCreateSchema = z.object({
  name: z.string({ error: MISSING_REQUIRED }).min(1, MISSING_REQUIRED),
  categories: z
    .array(z.string(), { error: MISSING_REQUIRED })
    .min(1, MISSING_REQUIRED),
  papersPerCategory: z.number({ error: MISSING_REQUIRED }).min(1, MISSING_REQUIRED),
  intervalDays: z.number().optional(),
  email: z
    .string()
    .refine((val) => !val || emailRegex.test(val), "Invalid email format")
    .optional(),
  keywords: z.array(z.string()).optional(),
  keywordMatchMode: z
    .enum(["any", "all"], { error: "keywordMatchMode must be 'any' or 'all'" })
    .optional(),
  scheduleType: z.enum(["interval", "weekly"], { error: "scheduleType must be 'interval' or 'weekly'" }).optional(),
  weekDays: z.array(z.number()).optional(),
  preferredHour: z.number().optional(),
  timezone: z.string().optional(),
});

export const scheduleExportItemSchema = z.object({
  name: z.string().min(1),
  categories: z.array(z.string()).min(1),
  papersPerCategory: z.number().min(1),
  intervalDays: z.number().optional(),
  email: z
    .string()
    .refine((val) => !val || emailRegex.test(val), "Invalid email format")
    .optional(),
  keywords: z.array(z.string()).optional(),
  keywordMatchMode: z.enum(["any", "all"]).optional(),
  scheduleType: z.enum(["interval", "weekly"]).optional(),
  weekDays: z.array(z.number()).optional(),
  preferredHour: z.number().optional(),
  timezone: z.string().optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export const scheduleImportSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  schedules: z.array(scheduleExportItemSchema).min(1, "No schedules to import"),
});

export const scheduleUpdateSchema = z.object({
  name: z.string().optional(),
  categories: z.array(z.string()).optional(),
  papersPerCategory: z.number().optional(),
  intervalDays: z.number().optional(),
  status: z
    .enum(["active", "paused"], { error: "status must be either 'active' or 'paused'" })
    .optional(),
  email: z
    .string()
    .refine((val) => !val || emailRegex.test(val), "Invalid email format")
    .optional()
    .nullable(),
  scheduleType: z.enum(["interval", "weekly"], { error: "scheduleType must be 'interval' or 'weekly'" }).optional(),
  weekDays: z.array(z.number()).optional(),
  preferredHour: z.number().optional(),
  timezone: z.string().optional(),
});

export function validateScheduleTiming(body: {
  scheduleType: string;
  intervalDays?: number;
  weekDays?: number[];
  preferredHour?: number;
  timezone?: string;
}): string | null {
  if (body.scheduleType !== "interval" && body.scheduleType !== "weekly") {
    return "scheduleType must be 'interval' or 'weekly'";
  }

  if (body.scheduleType === "interval") {
    if (
      body.intervalDays === undefined ||
      !Number.isInteger(body.intervalDays) ||
      body.intervalDays < 1 ||
      body.intervalDays > 90
    ) {
      return "intervalDays must be an integer between 1 and 90";
    }
  }

  if (body.scheduleType === "weekly") {
    if (!Array.isArray(body.weekDays) || body.weekDays.length === 0) {
      return "weekDays must be a non-empty array when scheduleType is 'weekly'";
    }
    const seen = new Set<number>();
    for (const day of body.weekDays) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return "Each weekDay must be an integer between 0 (Sunday) and 6 (Saturday)";
      }
      if (seen.has(day)) {
        return "weekDays must not contain duplicates";
      }
      seen.add(day);
    }
  }

  if (body.preferredHour !== undefined) {
    if (
      !Number.isInteger(body.preferredHour) ||
      body.preferredHour < 0 ||
      body.preferredHour > 23
    ) {
      return "preferredHour must be an integer between 0 and 23";
    }
  }

  if (body.timezone !== undefined) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
    } catch {
      return "Invalid timezone";
    }
  }

  return null;
}
