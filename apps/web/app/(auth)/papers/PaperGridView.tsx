"use client";

import PaperCard from "./PaperCard";
import { Paper, Folder, PaperGroup } from "./PapersClient";

interface PaperGridViewProps {
  papers: Paper[];
  folders: Folder[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, paperId: string) => void;
  groupedPapers: PaperGroup[] | null;
}

export default function PaperGridView({
  papers,
  folders,
  selectedIds,
  onToggleSelect,
  onSelect,
  onContextMenu,
  groupedPapers,
}: PaperGridViewProps) {
  const getFolderColor = (paper: Paper): string | undefined => {
    if (!paper.folderId) return undefined;
    const folder = folders.find((f) => f._id === paper.folderId);
    return folder?.color;
  };

  if (groupedPapers) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {groupedPapers.map((group) => (
          <div key={group.category}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
              paddingBottom: "6px",
              borderBottom: "0.5px solid var(--border-primary)",
            }}>
              <span style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}>
                {group.displayName}
              </span>
              <span style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}>
                ({group.papers.length})
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
            }}>
              {group.papers.map((paper) => (
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
          </div>
        ))}
      </div>
    );
  }

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
