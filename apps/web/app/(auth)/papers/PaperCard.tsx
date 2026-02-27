"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import StatusBadge from "./StatusBadge";
import { getCategoryDisplayName } from "@/lib/categories";

interface PaperCardProps {
  paper: {
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
  };
  folderColor?: string;
  onSelect: (paperId: string) => void;
  onContextMenu: (e: React.MouseEvent, paperId: string) => void;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  isSelected: boolean;
}

export default function PaperCard({ paper, folderColor, onSelect, onContextMenu, onToggleSelect, isSelected }: PaperCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: paper._id });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ touchAction: "manipulation" }}
      >
        <div
          onClick={() => onSelect(paper._id)}
          onContextMenu={(e) => onContextMenu(e, paper._id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(paper._id);
            }
          }}
          role="button"
          tabIndex={0}
          style={{
            display: "block",
            background: isSelected
              ? "var(--accent-muted, rgba(99,102,241,0.08))"
              : isHovered ? "var(--bg-tertiary)" : "var(--bg-secondary)",
            borderWidth: folderColor ? "0.5px 0.5px 0.5px 3px" : "0.5px",
            borderStyle: "solid",
            borderTopColor: isSelected ? "var(--accent)" : isHovered ? "var(--border-secondary)" : "var(--border-primary)",
            borderRightColor: isSelected ? "var(--accent)" : isHovered ? "var(--border-secondary)" : "var(--border-primary)",
            borderBottomColor: isSelected ? "var(--accent)" : isHovered ? "var(--border-secondary)" : "var(--border-primary)",
            borderLeftColor: folderColor || (isSelected ? "var(--accent)" : isHovered ? "var(--border-secondary)" : "var(--border-primary)"),
            borderRadius: "6px",
            padding: "16px",
            transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            opacity: isDragging ? 0.4 : 1,
            cursor: isDragging ? "grabbing" : "pointer",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {(isHovered || isSelected) && (
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggleSelect(paper._id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey)}
              style={{
                position: "absolute",
                top: "8px",
                left: folderColor ? "11px" : "8px",
                cursor: "pointer",
                accentColor: "var(--accent)",
                zIndex: 1,
              }}
            />
          )}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                {paper.paper?.title || paper.arxivId}
              </h3>
              {paper.paper?.authors && (
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  {paper.paper.authors.slice(0, 3).join(", ")}
                  {paper.paper.authors.length > 3 && " et al."}
                </p>
              )}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {paper.paper?.categories?.slice(0, 3).map((cat) => (
                  <span
                    key={cat}
                    style={{
                      padding: "2px 6px",
                      background: "var(--bg-tertiary)",
                      border: "0.5px solid var(--border-secondary)",
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      fontWeight: 500,
                      borderRadius: "3px",
                    }}
                  >
                    {getCategoryDisplayName(cat)}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex sm:flex-col justify-between sm:justify-start items-start sm:text-right sm:min-w-[120px]">
              <StatusBadge status={paper.status} />
              {paper.costs && (
                <div style={{ fontSize: "12px", fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)", marginTop: "8px", fontVariantNumeric: "tabular-nums" }}>
                  ${paper.costs.estimatedCostUsd.toFixed(4)}
                </div>
              )}
              <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                {new Date(paper.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
