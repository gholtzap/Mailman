"use client";

import { useState } from "react";
import SearchInput from "./SearchInput";
import BulkFolderPicker from "./BulkFolderPicker";

interface Folder {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface PapersToolbarProps {
  selectedFolderId: string | null;
  folders: Folder[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  selectedCount: number;
  hasFailedSelected: boolean;
  onBulkMove: (folderId: string | null) => void;
  onBulkDelete: () => void;
  onBulkRetry: () => void;
  onClearSelection: () => void;
  onNavigateToRoot: () => void;
  folderName: string | null;
  onToggleSidebar: () => void;
  groupByCategory: boolean;
  onGroupByCategoryChange: (enabled: boolean) => void;
  onAddPaper: () => void;
  onBatchProcess: () => void;
}

export default function PapersToolbar({
  selectedFolderId,
  folders,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  hasFailedSelected,
  onBulkMove,
  onBulkDelete,
  onBulkRetry,
  onClearSelection,
  onNavigateToRoot,
  folderName,
  onToggleSidebar,
  groupByCategory,
  onGroupByCategoryChange,
  onAddPaper,
  onBatchProcess,
}: PapersToolbarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusOptions = ["all", "pending", "processing", "completed", "failed"];

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", fontSize: "13px" }}>
        <button
          onClick={onNavigateToRoot}
          style={{
            background: "none",
            border: "none",
            color: selectedFolderId ? "var(--accent)" : "var(--text-primary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: selectedFolderId ? "pointer" : "default",
            padding: "2px 0",
            textDecoration: "none",
          }}
        >
          All Papers
        </button>
        {folderName && (
          <>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{folderName}</span>
          </>
        )}
        {selectedFolderId === "unfiled" && (
          <>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Unfiled</span>
          </>
        )}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}>
        <SearchInput value={searchQuery} onChange={onSearchChange} />

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            style={{
              padding: "7px 10px",
              fontSize: "13px",
              fontWeight: 500,
              border: "0.5px solid var(--border-primary)",
              background: statusFilter !== "all" ? "var(--accent)" : "var(--bg-secondary)",
              color: statusFilter !== "all" ? "white" : "var(--text-secondary)",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {statusFilter === "all" ? "Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showStatusDropdown && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 20 }}
                onClick={() => setShowStatusDropdown(false)}
              />
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "var(--bg-secondary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 21,
                minWidth: "140px",
                padding: "4px 0",
              }}>
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusFilterChange(s);
                      setShowStatusDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 12px",
                      background: "transparent",
                      border: "none",
                      color: statusFilter === s ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: statusFilter === s ? 500 : 400,
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => onGroupByCategoryChange(!groupByCategory)}
          style={{
            padding: "7px 10px",
            fontSize: "13px",
            fontWeight: 500,
            border: "0.5px solid var(--border-primary)",
            background: groupByCategory ? "var(--accent)" : "var(--bg-secondary)",
            color: groupByCategory ? "white" : "var(--text-secondary)",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="3" rx="1" />
            <rect x="3" y="10" width="7" height="3" rx="1" />
            <rect x="3" y="17" width="7" height="3" rx="1" />
            <line x1="14" y1="4.5" x2="21" y2="4.5" />
            <line x1="14" y1="11.5" x2="21" y2="11.5" />
            <line x1="14" y1="18.5" x2="21" y2="18.5" />
          </svg>
          Group
        </button>

        <div style={{ display: "flex", border: "0.5px solid var(--border-primary)", borderRadius: "6px", overflow: "hidden" }}>
          <button
            onClick={() => onViewModeChange("list")}
            title="List view"
            style={{
              padding: "6px 10px",
              background: viewMode === "list" ? "var(--bg-tertiary)" : "var(--bg-secondary)",
              border: "none",
              color: viewMode === "list" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            title="Grid view"
            style={{
              padding: "6px 10px",
              background: viewMode === "grid" ? "var(--bg-tertiary)" : "var(--bg-secondary)",
              border: "none",
              borderLeft: "0.5px solid var(--border-primary)",
              color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>

        <button
          onClick={onToggleSidebar}
          className="md:hidden"
          style={{
            background: "var(--bg-secondary)",
            border: "0.5px solid var(--border-primary)",
            borderRadius: "6px",
            color: "var(--text-secondary)",
            fontSize: "13px",
            cursor: "pointer",
            padding: "7px 10px",
          }}
        >
          Folders
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            onClick={onBatchProcess}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "7px 12px",
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            Batch Process
          </button>
          <button
            onClick={onAddPaper}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "7px 12px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
          >
            + New Paper
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "12px",
          padding: "8px 12px",
          background: "var(--bg-tertiary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          fontSize: "13px",
        }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {selectedCount} selected
          </span>
          <div style={{ width: "1px", height: "16px", background: "var(--border-primary)" }} />
          <BulkFolderPicker folders={folders} onSelect={onBulkMove} />
          {hasFailedSelected && (
            <button
              onClick={onBulkRetry}
              style={{
                padding: "4px 10px",
                background: "var(--accent)",
                border: "none",
                color: "white",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          )}
          <button
            onClick={() => {
              if (confirmDelete) {
                onBulkDelete();
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            style={{
              padding: "4px 10px",
              background: confirmDelete ? "var(--error)" : "transparent",
              border: confirmDelete ? "none" : "0.5px solid var(--error)",
              color: confirmDelete ? "white" : "var(--error)",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {confirmDelete ? "Confirm delete?" : "Delete"}
          </button>
          <button
            onClick={() => {
              onClearSelection();
              setConfirmDelete(false);
            }}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
