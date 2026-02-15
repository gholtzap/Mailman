import { z } from "zod";

export const papersFetchSchema = z.object({
  arxivUrl: z.string(),
});

export const paperFolderSchema = z.object({
  folderId: z.string().nullable().optional(),
});

export const papersBulkSchema = z.object({
  action: z.string({ required_error: "Invalid request body" }),
  paperIds: z
    .array(z.string(), {
      required_error: "Invalid request body",
      invalid_type_error: "Invalid request body",
    })
    .min(1, "Invalid request body"),
  folderId: z.string().nullable().optional(),
});
