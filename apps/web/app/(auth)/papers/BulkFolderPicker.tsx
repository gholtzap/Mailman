"use client";

import { useState } from "react";

interface Folder {
  _id: string;
  name: string;
  color: string;
}

interface BulkFolderPickerProps {
  folders: Folder[];
  onSelect: (folderId: string | null) => void;
}

export default function BulkFolderPicker({ folders, onSelect }: BulkFolderPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "4px 10px",
          background: "transparent",
          border: "0.5px solid var(--border-primary)",
          color: "var(--text-secondary)",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        Move to...
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--bg-secondary)",
            border: "0.5px solid var(--border-primary)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 31,
            minWidth: "160px",
            padding: "4px 0",
          }}>
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Unfiled
            </button>
            {folders.map((folder) => (
              <button
                key={folder._id}
                onClick={() => { onSelect(folder._id); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                {folder.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
