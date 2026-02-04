"use client";

import { useState } from "react";
import { FOLDER_COLORS } from "@/lib/constants/folder-colors";

interface FolderFormProps {
  initialName?: string;
  initialColor?: string;
  onSubmit: (name: string, color: string) => void;
  onCancel: () => void;
}

export default function FolderForm({ initialName = "", initialColor = FOLDER_COLORS[0], onSubmit, onCancel }: FolderFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), color);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "8px 0" }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        autoFocus
        style={{
          width: "100%",
          padding: "6px 8px",
          background: "var(--bg-primary)",
          border: "0.5px solid var(--border-secondary)",
          borderRadius: "4px",
          color: "var(--text-primary)",
          fontSize: "13px",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: "8px",
        }}
      />
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
        {FOLDER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
              cursor: "pointer",
              padding: 0,
              boxSizing: "border-box",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            flex: 1,
            padding: "4px 0",
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5,
            minHeight: "28px",
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "4px 0",
            background: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "0.5px solid var(--border-primary)",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            minHeight: "28px",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
