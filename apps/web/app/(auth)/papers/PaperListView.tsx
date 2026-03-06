"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import StatusBadge from "./StatusBadge";
import SortableColumnHeader from "./SortableColumnHeader";

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

interface PaperGroup {
  category: string;
  displayName: string;
  papers: Paper[];
}

interface PaperListViewProps {
  papers: Paper[];
  folders: Folder[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelectAll: () => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, paperId: string) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  groupedPapers: PaperGroup[] | null;
}

export default function PaperListView({
  papers,
  folders,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelect,
  onContextMenu,
  sortField,
  sortDirection,
  onSort,
  groupedPapers,
}: PaperListViewProps) {
  const allSelected = papers.length > 0 && papers.every((p) => selectedIds.has(p._id));

  const getFolderColor = (paper: Paper): string | undefined => {
    if (!paper.folderId) return undefined;
    const folder = folders.find((f) => f._id === paper.folderId);
    return folder?.color;
  };

  return (
    <div style={{
      border: "0.5px solid var(--border-primary)",
      borderRadius: "6px",
      overflow: "hidden",
      background: "var(--bg-secondary)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "0.5px solid var(--border-primary)",
        background: "var(--bg-tertiary)",
        gap: "16px",
      }}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          style={{ cursor: "pointer", accentColor: "var(--accent)", flexShrink: 0 }}
        />
        <div style={{ flex: 3, minWidth: 0 }}>
          <SortableColumnHeader label="Name" field="title" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
        </div>
        <div className="hidden lg:block" style={{ flex: 1.5, minWidth: 0 }}>
          <SortableColumnHeader label="Categories" field="category" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
        </div>
        <div style={{ width: "90px", flexShrink: 0 }}>
          <SortableColumnHeader label="Status" field="status" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
        </div>
        <div className="hidden sm:block" style={{ width: "90px", flexShrink: 0 }}>
          <SortableColumnHeader label="Date" field="createdAt" currentSort={sortField} currentDirection={sortDirection} onSort={onSort} />
        </div>
        <div className="hidden md:block" style={{ width: "70px", flexShrink: 0, textAlign: "right" }}>
          <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
            Cost
          </span>
        </div>
      </div>

      {groupedPapers ? (
        groupedPapers.map((group) => (
          <div key={group.category}>
            <div style={{
              padding: "8px 16px",
              background: "var(--bg-tertiary)",
              borderBottom: "0.5px solid var(--border-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{
                fontSize: "12px",
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
            {group.papers.map((paper) => (
              <PaperRow
                key={paper._id}
                paper={paper}
                folderColor={getFolderColor(paper)}
                isSelected={selectedIds.has(paper._id)}
                onToggleSelect={onToggleSelect}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        ))
      ) : (
        papers.map((paper) => (
          <PaperRow
            key={paper._id}
            paper={paper}
            folderColor={getFolderColor(paper)}
            isSelected={selectedIds.has(paper._id)}
            onToggleSelect={onToggleSelect}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))
      )}
    </div>
  );
}

function PaperRow({
  paper,
  folderColor,
  isSelected,
  onToggleSelect,
  onSelect,
  onContextMenu,
}: {
  paper: Paper;
  folderColor?: string;
  isSelected: boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, paperId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: paper._id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ touchAction: "manipulation" }}
    >
      <div
        onClick={() => onSelect(paper._id)}
        onContextMenu={(e) => onContextMenu(e, paper._id)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          gap: "16px",
          borderBottom: "0.5px solid var(--border-primary)",
          background: isSelected ? "var(--accent-muted, rgba(99,102,241,0.08))" : "transparent",
          borderLeft: folderColor ? `3px solid ${folderColor}` : "3px solid transparent",
          cursor: isDragging ? "grabbing" : "pointer",
          opacity: isDragging ? 0.4 : 1,
          transition: "background 100ms ease",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = "var(--bg-tertiary)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = "transparent";
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleSelect(paper._id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey)}
          style={{ cursor: "pointer", accentColor: "var(--accent)", flexShrink: 0 }}
        />
        <div style={{ flex: 3, minWidth: 0, overflow: "hidden" }}>
          <div style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {paper.paper?.title || paper.arxivId}
          </div>
          {paper.paper?.authors && (
            <div style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: "2px",
            }}>
              {paper.paper.authors.slice(0, 3).join(", ")}
              {paper.paper.authors.length > 3 && " et al."}
            </div>
          )}
        </div>
        <div className="hidden lg:flex" style={{ flex: 1.5, minWidth: 0, gap: "4px", flexWrap: "wrap" }}>
          {paper.paper?.categories?.slice(0, 2).map((cat) => (
            <span
              key={cat}
              style={{
                padding: "1px 5px",
                background: "var(--bg-tertiary)",
                border: "0.5px solid var(--border-secondary)",
                color: "var(--text-muted)",
                fontSize: "10px",
                fontWeight: 500,
                borderRadius: "3px",
              }}
            >
              {cat}
            </span>
          ))}
        </div>
        <div style={{ width: "90px", flexShrink: 0 }}>
          <StatusBadge status={paper.status} />
        </div>
        <div className="hidden sm:block" style={{ width: "90px", flexShrink: 0, fontSize: "12px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {new Date(paper.createdAt).toLocaleDateString()}
        </div>
        <div className="hidden md:block" style={{ width: "70px", flexShrink: 0, textAlign: "right", fontSize: "12px", fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          {paper.costs ? `$${paper.costs.estimatedCostUsd.toFixed(4)}` : "-"}
        </div>
      </div>
    </div>
  );
}
