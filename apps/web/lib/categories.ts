import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories";
import { MEDRXIV_CATEGORY_BY_ID } from "@/lib/medrxiv-categories";

const ARXIV_CATEGORY_BY_ID = new Map(
  ARXIV_CATEGORIES.flatMap((section) =>
    section.categories.map((c) => [c.id, c.name] as const)
  )
);

export function getCategoryDisplayName(id: string): string {
  const medrxiv = MEDRXIV_CATEGORY_BY_ID.get(id);
  if (medrxiv) return medrxiv.name;

  const arxiv = ARXIV_CATEGORY_BY_ID.get(id);
  if (arxiv) return arxiv;

  return id;
}

export function getSourceLabel(source?: string): string {
  return source === "medrxiv" ? "medRxiv" : "arXiv";
}

export function getExternalPaperUrl(arxivId: string, source?: string): string {
  if (source === "medrxiv") {
    return `https://www.medrxiv.org/content/${arxivId}`;
  }
  return `https://arxiv.org/abs/${arxivId}`;
}
