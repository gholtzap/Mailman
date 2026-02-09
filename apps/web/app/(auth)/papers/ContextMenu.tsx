"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Folder {
  _id: string;
  name: string;
  color: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  paperId: string;
  paperStatus: string;
  paperFolderId?: string;
  folders: Folder[];
  onClose: () => void;
  onOpen: (paperId: string) => void;
  onMove: (paperId: string, folderId: string | null) => void;
  onRetry: (paperId: string) => void;
  onDelete: (paperId: string) => void;
}

export default function ContextMenu({
  x,
  y,
  paperId,
  paperStatus,
  paperFolderId,
  folders,
  onClose,
  onOpen,
  onMove,
  onRetry,
  onDelete,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFolderSub, setShowFolderSub] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const newX = x + rect.width > window.innerWidth - 8 ? x - rect.width : x;
    const newY = y + rect.height > window.innerHeight - 8 ? Math.max(8, y - rect.height) : y;
    setPosition({ x: newX, y: newY });
  }, [x, y]);

  useEffect(() => {
    const handleClose = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const menuContent = (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "8px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 1000,
          minWidth: "180px",
          padding: "4px 0",
        }}
      >
        <MenuItem
          label="Open"
          onClick={() => { onOpen(paperId); onClose(); }}
        />

        <div style={{ height: "1px", background: "var(--border-primary)", margin: "4px 0" }} />

        <div
          style={{ position: "relative" }}
          onMouseEnter={() => setShowFolderSub(true)}
          onMouseLeave={() => setShowFolderSub(false)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Move to...
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          {showFolderSub && (
            <div style={{
              position: "absolute",
              left: "100%",
              top: 0,
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              minWidth: "160px",
              padding: "4px 0",
              marginLeft: "2px",
            }}>
              <button
                onClick={() => { onMove(paperId, null); onClose(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: !paperFolderId ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: !paperFolderId ? 500 : 400,
                }}
              >
                Unfiled
                {!paperFolderId && <CheckIcon />}
              </button>
              {folders.map((folder) => (
                <button
                  key={folder._id}
                  onClick={() => { onMove(paperId, folder._id); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: paperFolderId === folder._id ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: paperFolderId === folder._id ? 500 : 400,
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{folder.name}</span>
                  {paperFolderId === folder._id && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>

        {(paperStatus === "failed" || paperStatus === "pending") && (
          <MenuItem
            label="Retry"
            onClick={() => { onRetry(paperId); onClose(); }}
          />
        )}

        <div style={{ height: "1px", background: "var(--border-primary)", margin: "4px 0" }} />

        <MenuItem
          label={confirmDelete ? "Confirm delete?" : "Delete"}
          color="var(--error)"
          onClick={() => {
            if (confirmDelete) {
              onDelete(paperId);
              onClose();
            } else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
            }
          }}
        />
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menuContent, document.body);
}

function MenuItem({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 12px",
        background: "transparent",
        border: "none",
        color: color || "var(--text-secondary)",
        fontSize: "13px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {label}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
