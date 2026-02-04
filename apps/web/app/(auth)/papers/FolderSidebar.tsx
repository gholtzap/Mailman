"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import FolderForm from "./FolderForm";

interface Folder {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onFolderCreated: (folder: Folder) => void;
  onFolderUpdated: (folder: Folder) => void;
  onFolderDeleted: (id: string) => void;
  onFoldersReordered: (folders: Folder[]) => void;
}

export default function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onFolderCreated,
  onFolderUpdated,
  onFolderDeleted,
  onFoldersReordered,
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async (name: string, color: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const data = await res.json();
      onFolderCreated(data.folder);
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, name: string, color: string) => {
    const res = await fetch(`/api/folders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const data = await res.json();
      onFolderUpdated(data.folder);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) {
      onFolderDeleted(id);
      if (selectedFolderId === id) {
        onSelectFolder(null);
      }
    }
  };

  return (
    <div style={{
      width: "240px",
      flexShrink: 0,
      borderRight: "0.5px solid var(--border-primary)",
      paddingRight: "16px",
    }}>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 500 }}>
            Folders
          </span>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "18px",
                cursor: "pointer",
                lineHeight: 1,
                padding: "0 2px",
                minHeight: "24px",
                display: "flex",
                alignItems: "center",
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <AllPapersDroppable
        isSelected={selectedFolderId === null}
        onClick={() => onSelectFolder(null)}
      />

      <UnfiledDroppable
        isSelected={selectedFolderId === "unfiled"}
        onClick={() => onSelectFolder("unfiled")}
      />

      <div style={{ marginTop: "4px" }}>
        {folders.map((folder) => (
          <SortableFolderItem
            key={folder._id}
            folder={folder}
            isSelected={selectedFolderId === folder._id}
            isEditing={editingId === folder._id}
            onSelect={() => onSelectFolder(folder._id)}
            onEdit={() => setEditingId(folder._id)}
            onEditCancel={() => setEditingId(null)}
            onUpdate={(name, color) => handleUpdate(folder._id, name, color)}
            onDelete={() => handleDelete(folder._id)}
          />
        ))}
      </div>

      {creating && (
        <div style={{
          marginTop: "4px",
          background: "var(--bg-secondary)",
          borderRadius: "4px",
          padding: "0 8px",
        }}>
          <FolderForm
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
    </div>
  );
}

function AllPapersDroppable({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        textAlign: "left",
        padding: "6px 8px",
        background: isSelected ? "var(--bg-tertiary)" : "transparent",
        border: "none",
        borderRadius: "4px",
        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: "13px",
        fontWeight: isSelected ? 500 : 400,
        cursor: "pointer",
        transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <span style={{ fontSize: "14px" }}></span>
      All Papers
    </button>
  );
}

function UnfiledDroppable({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: "unfiled" });

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          textAlign: "left",
          padding: "6px 8px",
          background: isOver ? "var(--bg-elevated)" : isSelected ? "var(--bg-tertiary)" : "transparent",
          border: isOver ? "0.5px solid var(--accent)" : "none",
          borderRadius: "4px",
          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "13px",
          fontWeight: isSelected ? 500 : 400,
          cursor: "pointer",
          transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        <span style={{ fontSize: "14px" }}>--</span>
        Unfiled
      </button>
    </div>
  );
}

function SortableFolderItem({
  folder,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onEditCancel,
  onUpdate,
  onDelete,
}: {
  folder: { _id: string; name: string; color: string };
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onEditCancel: () => void;
  onUpdate: (name: string, color: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: folder._id });
  const [showMenu, setShowMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isEditing) {
    return (
      <div style={{
        background: "var(--bg-secondary)",
        borderRadius: "4px",
        padding: "0 8px",
        marginBottom: "2px",
      }}>
        <FolderForm
          initialName={folder.name}
          initialColor={folder.color}
          onSubmit={onUpdate}
          onCancel={onEditCancel}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: "relative",
        marginBottom: "2px",
      }}
    >
      <button
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          textAlign: "left",
          padding: "6px 8px",
          background: isOver ? "var(--bg-elevated)" : isSelected ? "var(--bg-tertiary)" : "transparent",
          border: isOver ? "0.5px solid var(--accent)" : "none",
          borderRadius: "4px",
          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "13px",
          fontWeight: isSelected ? 500 : 400,
          cursor: "pointer",
          transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
        <span
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            color: "var(--text-faint)",
            fontSize: "12px",
            userSelect: "none",
            touchAction: "none",
            paddingLeft: "4px",
          }}
        >
          ::
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        style={{
          position: "absolute",
          right: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontSize: "14px",
          cursor: "pointer",
          padding: "0 4px",
          lineHeight: 1,
          minHeight: "20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        ...
      </button>
      {showMenu && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: "0",
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10,
          minWidth: "120px",
          padding: "4px 0",
        }}>
          <button
            onClick={() => {
              setShowMenu(false);
              onEdit();
            }}
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
            Edit
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              onDelete();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: "var(--error)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
