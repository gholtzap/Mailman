import { z } from "zod";

export const papersFetchSchema = z.object({
  arxivUrl: z.string(),
});

export const paperFolderSchema = z.object({
  folderId: z.string().nullable().optional(),
});

export const papersBulkSchema = z.object({
  action: z.string({ error: "Invalid request body" }),
  paperIds: z
    .array(
      z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid paper ID"),
      { error: "Invalid request body" },
    )
    .min(1, "Invalid request body"),
  folderId: z.string().nullable().optional(),
});
