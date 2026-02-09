"use client";

import PaperCard from "./PaperCard";

interface Paper {
  _id: string;
  paperId: string;
  arxivId: string;
  status: string;
  folderId?: string;
  createdAt: string;
  costs?: {
    estimatedCostUsd: number;
  };
  paper?: {
    title: string;
    authors: string[];
    categories: string[];
  };
}

interface Folder {
  _id: string;
  name: string;
  color: string;
}

interface PaperGridViewProps {
  papers: Paper[];
  folders: Folder[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, paperId: string) => void;
}

export default function PaperGridView({
  papers,
  folders,
  selectedIds,
  onToggleSelect,
  onSelect,
  onContextMenu,
}: PaperGridViewProps) {
  const getFolderColor = (paper: Paper): string | undefined => {
    if (!paper.folderId) return undefined;
    const folder = folders.find((f) => f._id === paper.folderId);
    return folder?.color;
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "12px",
    }}>
      {papers.map((paper) => (
        <PaperCard
          key={paper._id}
          paper={paper}
          folderColor={getFolderColor(paper)}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onToggleSelect={onToggleSelect}
          isSelected={selectedIds.has(paper._id)}
        />
      ))}
    </div>
  );
}
