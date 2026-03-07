"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type FormEvent } from "react";
import { DndContext, closestCenter, pointerWithin, DragOverlay, CollisionDetection, DragStartEvent, DragEndEvent, PointerSensor, useSensors, useSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getCategoryDisplayName } from "@/lib/categories";
import { ARXIV_CATEGORIES, POPULAR_CATEGORY_IDS } from "@/lib/arxiv-categories";
import { MEDRXIV_CATEGORIES } from "@/lib/medrxiv-categories";
import Modal from "@/app/components/Modal";

const POPULAR_CATEGORIES = ARXIV_CATEGORIES.flatMap(section =>
  section.categories.filter(cat => POPULAR_CATEGORY_IDS.has(cat.id))
);

const ALL_CATEGORY_SECTIONS = [
  ...ARXIV_CATEGORIES,
  { section: "Medicine (medRxiv)", categories: MEDRXIV_CATEGORIES.map(c => ({ id: c.id, name: c.name })) },
];

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

export interface Folder {
  _id: string;
  name: string;
  color: string;
  order: number;
}

export interface Paper {
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

export interface ContextMenuState {
  x: number;
  y: number;
  paperId: string;
}

export interface PaperGroup {
  category: string;
  displayName: string;
  papers: Paper[];
}

function getStoredViewMode(): "list" | "grid" {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem("papers-view-mode");
  return stored === "grid" ? "grid" : "list";
}

export default function PapersClient({ initialPapers, initialFolders }: { initialPapers: { papers: any[] }; initialFolders: { folders: any[] } }) {
  const [papers, setPapers] = useState<Paper[]>(initialPapers.papers);
  const [folders, setFolders] = useState<Folder[]>(initialFolders.folders);
  const [loading, setLoading] = useState(false);
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
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const lastSelectedIndex = useRef<number | null>(null);

  // New Paper modal
  const [showNewPaperModal, setShowNewPaperModal] = useState(false);
  const [arxivUrl, setArxivUrl] = useState("");
  const [newPaperSkipAI, setNewPaperSkipAI] = useState(false);
  const [newPaperLoading, setNewPaperLoading] = useState(false);
  const [newPaperMessage, setNewPaperMessage] = useState("");

  // Batch Process modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCategories, setBatchCategories] = useState<string[]>([]);
  const [batchPapersPerCategory, setBatchPapersPerCategory] = useState(5);
  const [batchSkipAI, setBatchSkipAI] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");
  const [batchCategoryFilter, setBatchCategoryFilter] = useState("");

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
    if (!res.ok) return;
    const data = await res.json();
    setPapers(data.papers);
  }, [statusFilter, selectedFolderId, sortField, sortDirection, searchQuery]);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (!res.ok) return;
    const data = await res.json();
    setFolders(data.folders);
  }, []);

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

  const handleNewPaperSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNewPaperLoading(true);
    setNewPaperMessage("");
    try {
      const res = await fetch("/api/papers/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arxivUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const processRes = await fetch("/api/processing/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paperId: data.paper._id, skipAI: newPaperSkipAI }),
        });
        if (processRes.ok) {
          setShowNewPaperModal(false);
          setArxivUrl("");
          setNewPaperSkipAI(false);
          setNewPaperMessage("");
          await fetchPapers();
        } else {
          const processError = await processRes.json();
          setNewPaperMessage(`Failed to queue processing: ${processError.details || processError.error || "Unknown error"}`);
        }
      } else {
        const error = await res.json();
        setNewPaperMessage(error.error || "Failed to fetch paper");
      }
    } catch (error) {
      setNewPaperMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setNewPaperLoading(false);
    }
  };

  const toggleBatchCategory = (id: string) => {
    setBatchCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filteredBatchCategories = useMemo(() =>
    ALL_CATEGORY_SECTIONS.map(section => ({
      ...section,
      categories: section.categories.filter(cat => {
        if (!batchCategoryFilter) return true;
        const f = batchCategoryFilter.toLowerCase();
        return cat.id.toLowerCase().includes(f) || cat.name.toLowerCase().includes(f);
      })
    })).filter(section => section.categories.length > 0),
    [batchCategoryFilter]
  );

  const handleBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (batchCategories.length === 0) {
      setBatchMessage("Please select at least one category");
      return;
    }
    setBatchLoading(true);
    setBatchMessage("");
    try {
      const res = await fetch("/api/processing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: batchCategories,
          papersPerCategory: batchPapersPerCategory,
          skipAI: batchSkipAI,
        }),
      });
      if (res.ok) {
        setShowBatchModal(false);
        setBatchCategories([]);
        setBatchPapersPerCategory(5);
        setBatchSkipAI(false);
        setBatchMessage("");
        setBatchCategoryFilter("");
        await fetchPapers();
      } else {
        const error = await res.json();
        setBatchMessage(`Failed to start batch processing: ${error.details || error.error || "Unknown error"}`);
      }
    } catch (error) {
      setBatchMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBatchLoading(false);
    }
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

  const groupedPapers = useMemo(() => {
    if (!groupByCategory) return null;
    const groups: { category: string; displayName: string; papers: Paper[] }[] = [];
    const groupMap = new Map<string, Paper[]>();
    for (const paper of papers) {
      const cat = paper.paper?.categories?.[0] || "uncategorized";
      if (!groupMap.has(cat)) groupMap.set(cat, []);
      groupMap.get(cat)!.push(paper);
    }
    for (const [category, categoryPapers] of groupMap) {
      groups.push({
        category,
        displayName: category === "uncategorized" ? "Uncategorized" : getCategoryDisplayName(category),
        papers: categoryPapers,
      });
    }
    groups.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return groups;
  }, [papers, groupByCategory]);

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
              groupByCategory={groupByCategory}
              onGroupByCategoryChange={setGroupByCategory}
              onAddPaper={() => { setArxivUrl(""); setNewPaperSkipAI(false); setNewPaperMessage(""); setShowNewPaperModal(true); }}
              onBatchProcess={() => { setBatchCategories([]); setBatchPapersPerCategory(5); setBatchSkipAI(false); setBatchMessage(""); setBatchCategoryFilter(""); setShowBatchModal(true); }}
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
                groupedPapers={groupedPapers}
              />
            ) : (
              <PaperGridView
                papers={papers}
                folders={folders}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelect={setSelectedPaperId}
                onContextMenu={handleContextMenu}
                groupedPapers={groupedPapers}
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

      <Modal isOpen={showNewPaperModal} onClose={() => setShowNewPaperModal(false)} title="Add New Paper">
        <form onSubmit={handleNewPaperSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
              arXiv or medRxiv URL
            </label>
            <input
              type="text"
              value={arxivUrl}
              onChange={(e) => setArxivUrl(e.target.value)}
              placeholder="arxiv.org/abs/2401.12345 or medrxiv.org/content/10.1101/..."
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                fontFamily: "var(--font-geist-mono)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-primary)")}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="newPaperSkipAI"
              checked={newPaperSkipAI}
              onChange={(e) => setNewPaperSkipAI(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
            />
            <label htmlFor="newPaperSkipAI" style={{ fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
              Skip AI processing (extract raw text only, no cost)
            </label>
          </div>
          <button
            type="submit"
            disabled={newPaperLoading || !arxivUrl}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: newPaperLoading || !arxivUrl ? "not-allowed" : "pointer",
              opacity: newPaperLoading || !arxivUrl ? 0.5 : 1,
              transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {newPaperLoading ? "Processing..." : "Fetch and Process Paper"}
          </button>
          {newPaperMessage && (
            <div style={{
              padding: "12px",
              background: "var(--error-muted)",
              border: "0.5px solid var(--error)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--error)",
            }}>
              {newPaperMessage}
            </div>
          )}
        </form>
      </Modal>

      <Modal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} title="Batch Process Papers" maxWidth="640px">
        <form onSubmit={handleBatchSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "12px" }}>
              Select Categories ({batchCategories.length} selected)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {POPULAR_CATEGORIES.map((category) => {
                const isSelected = batchCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleBatchCategory(category.id)}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      border: `0.5px solid ${isSelected ? "var(--accent)" : "var(--border-primary)"}`,
                      background: isSelected ? "var(--accent-muted)" : "var(--bg-primary)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 500, color: isSelected ? "var(--accent)" : "var(--text-primary)", marginBottom: "2px" }}>
                      {category.name}
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)", color: "var(--text-muted)" }}>
                      {category.id}
                    </div>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={batchCategoryFilter}
              onChange={(e) => setBatchCategoryFilter(e.target.value)}
              placeholder="Search all categories..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                marginTop: "12px",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-primary)")}
            />
            <div style={{
              maxHeight: "200px",
              overflowY: "auto",
              marginTop: "8px",
              padding: "12px",
              background: "var(--bg-primary)",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "6px",
            }}>
              {filteredBatchCategories.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No categories match your search
                </div>
              ) : (
                filteredBatchCategories.map(section => (
                  <div key={section.section} style={{ marginBottom: "16px" }}>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                      paddingBottom: "4px",
                      borderBottom: "0.5px solid var(--border-primary)",
                    }}>
                      {section.section}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {section.categories.map(category => (
                        <label
                          key={category.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            transition: "background 150ms",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <input
                            type="checkbox"
                            checked={batchCategories.includes(category.id)}
                            onChange={() => toggleBatchCategory(category.id)}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)" }}>
                              {category.id}
                            </span>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginLeft: "8px" }}>
                              {category.name}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Papers Per Category
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={batchPapersPerCategory || ""}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                setBatchPapersPerCategory(isNaN(parsed) ? 0 : Math.min(parsed, 20));
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-primary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontFamily: "var(--font-geist-mono)",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="5"
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-primary)";
                if (!batchPapersPerCategory) setBatchPapersPerCategory(1);
              }}
            />
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-geist-mono)" }}>
              Total papers to process: {batchCategories.length * batchPapersPerCategory}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="batchSkipAI"
              checked={batchSkipAI}
              onChange={(e) => setBatchSkipAI(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
            />
            <label htmlFor="batchSkipAI" style={{ fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
              Skip AI processing (extract raw text only, no cost)
            </label>
          </div>

          <button
            type="submit"
            disabled={batchLoading || batchCategories.length === 0}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: batchLoading || batchCategories.length === 0 ? "not-allowed" : "pointer",
              opacity: batchLoading || batchCategories.length === 0 ? 0.5 : 1,
              transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {batchLoading ? "Starting Batch Processing..." : `Process ${batchCategories.length * batchPapersPerCategory} Papers`}
          </button>
          {batchMessage && (
            <div style={{
              padding: "12px",
              background: "var(--error-muted)",
              border: "0.5px solid var(--error)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--error)",
            }}>
              {batchMessage}
            </div>
          )}
        </form>
      </Modal>
    </DndContext>
  );
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (active as HTMLElement).isContentEditable;
}
