"use client";

import { useState } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";

interface PaperCardProps {
  paper: {
    _id: string;
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
  onRetry: (paperId: string, e: React.MouseEvent) => void;
  onFolderAssigned: (paperId: string, folderId: string | null) => void;
  isRetrying: boolean;
  folders: { _id: string; name: string; color: string }[];
}

export default function PaperCard({ paper, folderColor, onRetry, onFolderAssigned, isRetrying, folders }: PaperCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: paper._id });
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const moveToFolder = async (folderId: string | null) => {
    setMovingTo(folderId);
    try {
      const res = await fetch(`/api/papers/${paper._id}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        onFolderAssigned(paper._id, folderId);
      }
    } finally {
      setMovingTo(null);
      setShowFolderMenu(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{
          touchAction: "manipulation",
        }}
      >
      <Link
        href={`/papers/${paper._id}`}
        style={{
          display: "block",
          background: isHovered ? "var(--bg-tertiary)" : "var(--bg-secondary)",
          borderWidth: folderColor ? "0.5px 0.5px 0.5px 3px" : "0.5px",
          borderStyle: "solid",
          borderTopColor: isHovered ? "var(--border-secondary)" : "var(--border-primary)",
          borderRightColor: isHovered ? "var(--border-secondary)" : "var(--border-primary)",
          borderBottomColor: isHovered ? "var(--border-secondary)" : "var(--border-primary)",
          borderLeftColor: folderColor || (isHovered ? "var(--border-secondary)" : "var(--border-primary)"),
          borderRadius: "6px",
          padding: "16px",
          textDecoration: "none",
          transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
          opacity: isDragging ? 0.4 : 1,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
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
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="flex sm:flex-col justify-between sm:justify-start items-start sm:text-right sm:min-w-[120px]">
            <StatusBadge status={paper.status} />
            {paper.status === "failed" && (
              <button
                onClick={(e) => onRetry(paper._id, e)}
                disabled={isRetrying}
                style={{
                  marginTop: "8px",
                  padding: "4px 8px",
                  background: "var(--accent)",
                  border: "none",
                  color: "white",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: isRetrying ? "not-allowed" : "pointer",
                  opacity: isRetrying ? 0.5 : 1,
                  transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                  width: "100%",
                  minHeight: "44px",
                }}
                onMouseEnter={(e) => {
                  if (!isRetrying) e.currentTarget.style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isRetrying) e.currentTarget.style.background = "var(--accent)";
                }}
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            )}
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
      </Link>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowFolderMenu(!showFolderMenu);
        }}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "var(--bg-tertiary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "4px",
          color: "var(--text-secondary)",
          fontSize: "12px",
          cursor: "pointer",
          padding: "2px 6px",
          minHeight: "24px",
          display: "flex",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        ...
      </button>
      {showFolderMenu && (
        <div
          style={{
            position: "absolute",
            top: "32px",
            right: "8px",
            background: "var(--bg-secondary)",
            border: "0.5px solid var(--border-primary)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: "160px",
            padding: "4px 0",
          }}
        >
          <div style={{ padding: "4px 8px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Move to folder
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              moveToFolder(null);
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 8px",
              background: "transparent",
              border: "none",
              color: !paper.folderId ? "var(--accent)" : "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: !paper.folderId ? 500 : 400,
            }}
          >
            Unfiled
          </button>
          {folders.map((folder) => (
            <button
              key={folder._id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveToFolder(folder._id);
              }}
              disabled={movingTo === folder._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                background: "transparent",
                border: "none",
                color: paper.folderId === folder._id ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: paper.folderId === folder._id ? 500 : 400,
                opacity: movingTo === folder._id ? 0.5 : 1,
              }}
            >
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    completed: { bg: "var(--success-muted)", text: "var(--success)" },
    failed: { bg: "var(--error-muted)", text: "var(--error)" },
    processing: { bg: "var(--warning-muted)", text: "var(--warning)" },
    pending: { bg: "var(--bg-tertiary)", text: "var(--text-muted)" },
  };

  const color = colors[status] || colors.pending;

  return (
    <span style={{
      display: "inline-block",
      padding: "4px 8px",
      background: color.bg,
      color: color.text,
      fontSize: "11px",
      fontWeight: 500,
      borderRadius: "4px",
    }}>
      {status}
    </span>
  );
}
