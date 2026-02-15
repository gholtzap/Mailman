import { z } from "zod";
import { FOLDER_COLORS } from "@/lib/constants/folder-colors";

export const folderCreateSchema = z.object({
  name: z
    .string({ required_error: "Folder name is required" })
    .refine((val) => val.trim().length > 0, "Folder name is required"),
  color: z.string().optional(),
});

export const folderUpdateSchema = z.object({
  name: z
    .string()
    .refine((val) => val.trim().length > 0, "Folder name cannot be empty")
    .optional(),
  color: z
    .string()
    .refine(
      (val) => FOLDER_COLORS.includes(val),
      "Invalid color"
    )
    .optional(),
});

export const folderReorderSchema = z.object({
  order: z
    .array(z.string(), {
      invalid_type_error: "order must be an array of folder ID strings",
    })
    .refine(
      (arr) => arr.every((id) => typeof id === "string"),
      "order must be an array of folder ID strings"
    ),
});
