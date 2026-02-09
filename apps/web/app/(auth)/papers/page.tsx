"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DndContext, closestCenter, pointerWithin, DragOverlay, CollisionDetection, DragStartEvent, DragEndEvent, PointerSensor, useSensors, useSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

const customCollisionDetection: CollisionDetection = (args) => {
  const pointerIntersections = pointerWithin(args);
  if (pointerIntersections.length > 0) {
    return pointerIntersections;
  }
  return closestCenter(args);
};
import FolderSidebar from "./FolderSidebar";
import PaperPanel from "./PaperPanel";
import PapersToolbar from "./PapersToolbar";
import PaperListView from "./PaperListView";
import PaperGridView from "./PaperGridView";
import ContextMenu from "./ContextMenu";

interface Folder {
  _id: string;
  name: string;
  color: string;
  order: number;
}

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

interface ContextMenuState {
  x: number;
  y: number;
  paperId: string;
}

function getStoredViewMode(): "list" | "grid" {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem("papers-view-mode");
  return stored === "grid" ? "grid" : "list";
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const lastSelectedIndex = useRef<number | null>(null);

  useEffect(() => {
    setViewMode(getStoredViewMode());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const fetchPapers = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (sortField) params.set("sort", sortField);
    if (sortDirection) params.set("sortDirection", sortDirection);
    if (searchQuery) params.set("search", searchQuery);

    const url = params.toString() ? `/api/papers?${params}` : "/api/papers";
    const res = await fetch(url);
    const data = await res.json();
    setPapers(data.papers);
  }, [statusFilter, selectedFolderId, sortField, sortDirection, searchQuery]);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    const data = await res.json();
    setFolders(data.folders);
  }, []);

  useEffect(() => {
    Promise.all([fetchPapers(), fetchFolders()]).then(() => setLoading(false));
  }, [fetchPapers, fetchFolders]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  useEffect(() => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  }, [selectedFolderId, statusFilter, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) {
          setContextMenu(null);
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        } else if (selectedPaperId) {
          setSelectedPaperId(null);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && !isInputFocused()) {
        e.preventDefault();
        setSelectedIds(new Set(papers.map((p) => p._id)));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPaperId, contextMenu, selectedIds, papers]);

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("papers-view-mode", mode);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleToggleSelect = (id: string, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex.current !== null) {
      const currentIndex = papers.findIndex((p) => p._id === id);
      if (currentIndex === -1) return;
      const start = Math.min(lastSelectedIndex.current, currentIndex);
      const end = Math.max(lastSelectedIndex.current, currentIndex);
      const rangeIds = papers.slice(start, end + 1).map((p) => p._id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rid) => next.add(rid));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastSelectedIndex.current = papers.findIndex((p) => p._id === id);
    }
  };

  const handleSelectAll = () => {
    const allSelected = papers.every((p) => selectedIds.has(p._id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(papers.map((p) => p._id)));
    }
  };

  const handleContextMenu = (e: React.MouseEvent, paperId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, paperId });
  };

  const handleMoveToFolder = async (paperId: string, folderId: string | null) => {
    await fetch(`/api/papers/${paperId}/folder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    await fetchPapers();
  };

  const handleRetryPaper = async (paperId: string) => {
    const paper = papers.find((p) => p._id === paperId);
    if (!paper) return;
    await fetch("/api/processing/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: paper.paperId }),
    });
    await fetchPapers();
  };

  const handleDeletePaper = async (paperId: string) => {
    await fetch(`/api/papers/${paperId}`, { method: "DELETE" });
    await fetchPapers();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(paperId);
      return next;
    });
  };

  const handleBulkMove = async (folderId: string | null) => {
    await fetch("/api/papers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", paperIds: Array.from(selectedIds), folderId }),
    });
    setSelectedIds(new Set());
    await fetchPapers();
  };

  const handleBulkDelete = async () => {
    await fetch("/api/papers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", paperIds: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    await fetchPapers();
  };

  const handleBulkRetry = async () => {
    await fetch("/api/papers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", paperIds: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    await fetchPapers();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dragActiveId = String(active.id);
    const overId = String(over.id);

    const activeIsFolderIdx = folders.findIndex((f) => f._id === dragActiveId);
    if (activeIsFolderIdx !== -1) {
      const overIdx = folders.findIndex((f) => f._id === overId);
      if (overIdx === -1 || activeIsFolderIdx === overIdx) return;

      const reordered = [...folders];
      const [moved] = reordered.splice(activeIsFolderIdx, 1);
      reordered.splice(overIdx, 0, moved);

      const updated = reordered.map((f, i) => ({ ...f, order: i }));
      setFolders(updated);

      await fetch("/api/folders/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: updated.map((f) => f._id) }),
      });
      return;
    }

    const paperId = dragActiveId;

    if (overId === "unfiled") {
      await fetch(`/api/papers/${paperId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: null }),
      });
      setPapers((prev) => prev.map((p) => (p._id === paperId ? { ...p, folderId: undefined } : p)));
      if (selectedFolderId) {
        setPapers((prev) => prev.filter((p) => p._id !== paperId));
      }
      return;
    }

    const targetFolder = folders.find((f) => f._id === overId);
    if (targetFolder) {
      await fetch(`/api/papers/${paperId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolder._id }),
      });
      setPapers((prev) => prev.map((p) => (p._id === paperId ? { ...p, folderId: targetFolder._id } : p)));
      if (selectedFolderId && selectedFolderId !== targetFolder._id) {
        setPapers((prev) => prev.filter((p) => p._id !== paperId));
      }
    }
  };

  const currentFolderName = selectedFolderId && selectedFolderId !== "unfiled"
    ? folders.find((f) => f._id === selectedFolderId)?.name || null
    : null;

  const hasFailedSelected = papers.some((p) => selectedIds.has(p._id) && (p.status === "failed" || p.status === "pending"));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? "No papers match your search."
    : selectedFolderId
      ? "No papers in this folder."
      : "No papers yet. Add one to get started.";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="p-4 md:p-8">
        <div style={{ display: "flex", gap: "24px" }}>
          <div className="hidden md:block">
            <SortableContext items={folders.map((f) => f._id)} strategy={verticalListSortingStrategy}>
              <FolderSidebar
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onFolderCreated={(folder) => setFolders((prev) => [...prev, folder])}
                onFolderUpdated={(folder) => setFolders((prev) => prev.map((f) => (f._id === folder._id ? folder : f)))}
                onFolderDeleted={(id) => setFolders((prev) => prev.filter((f) => f._id !== id))}
                onFoldersReordered={setFolders}
              />
            </SortableContext>
          </div>

          {sidebarOpen && (
            <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
              <div
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
                onClick={() => setSidebarOpen(false)}
              />
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "260px",
                background: "var(--bg-primary)",
                padding: "16px",
                overflowY: "auto",
                zIndex: 41,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Folders</span>
                  <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "18px", cursor: "pointer" }}>x</button>
                </div>
                <SortableContext items={folders.map((f) => f._id)} strategy={verticalListSortingStrategy}>
                  <FolderSidebar
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={(id) => { setSelectedFolderId(id); setSidebarOpen(false); }}
                    onFolderCreated={(folder) => setFolders((prev) => [...prev, folder])}
                    onFolderUpdated={(folder) => setFolders((prev) => prev.map((f) => (f._id === folder._id ? folder : f)))}
                    onFolderDeleted={(id) => setFolders((prev) => prev.filter((f) => f._id !== id))}
                    onFoldersReordered={setFolders}
                  />
                </SortableContext>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <PapersToolbar
              selectedFolderId={selectedFolderId}
              folders={folders}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              selectedCount={selectedIds.size}
              hasFailedSelected={hasFailedSelected}
              onBulkMove={handleBulkMove}
              onBulkDelete={handleBulkDelete}
              onBulkRetry={handleBulkRetry}
              onClearSelection={() => setSelectedIds(new Set())}
              onNavigateToRoot={() => setSelectedFolderId(null)}
              folderName={currentFolderName}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />

            {papers.length === 0 ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "6px",
                padding: "32px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--text-muted)",
              }}>
                {emptyMessage}
              </div>
            ) : viewMode === "list" ? (
              <PaperListView
                papers={papers}
                folders={folders}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onSelect={setSelectedPaperId}
                onContextMenu={handleContextMenu}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            ) : (
              <PaperGridView
                papers={papers}
                folders={folders}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelect={setSelectedPaperId}
                onContextMenu={handleContextMenu}
              />
            )}
          </div>

          <div style={{
            width: selectedPaperId ? "420px" : "0px",
            flexShrink: 0,
            overflow: "hidden",
            transition: "width 250ms cubic-bezier(0.25, 1, 0.5, 1)",
          }}>
            {selectedPaperId && (
              <PaperPanel paperId={selectedPaperId} onClose={() => setSelectedPaperId(null)} />
            )}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeId && papers.find((p) => p._id === activeId) ? (
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--accent)",
            borderRadius: "6px",
            padding: "10px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            cursor: "grabbing",
            maxWidth: "320px",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {papers.find((p) => p._id === activeId)?.paper?.title || activeId}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {contextMenu && (() => {
        const paper = papers.find((p) => p._id === contextMenu.paperId);
        if (!paper) return null;
        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            paperId={contextMenu.paperId}
            paperStatus={paper.status}
            paperFolderId={paper.folderId}
            folders={folders}
            onClose={() => setContextMenu(null)}
            onOpen={(id) => setSelectedPaperId(id)}
            onMove={handleMoveToFolder}
            onRetry={handleRetryPaper}
            onDelete={handleDeletePaper}
          />
        );
      })()}
    </DndContext>
  );
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (active as HTMLElement).isContentEditable;
}
