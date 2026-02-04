"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import FolderSidebar from "./FolderSidebar";
import PaperCard from "./PaperCard";

interface Folder {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface Paper {
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
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchPapers = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (selectedFolderId) params.set("folderId", selectedFolderId);

    const url = params.toString() ? `/api/papers?${params}` : "/api/papers";
    const res = await fetch(url);
    const data = await res.json();
    setPapers(data.papers);
  }, [statusFilter, selectedFolderId]);

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

  const retryPaper = async (paperId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRetrying(paperId);
    try {
      const res = await fetch("/api/processing/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });
      if (res.ok) {
        await fetchPapers();
      } else {
        const error = await res.json();
        alert(`Failed to retry: ${error.details || error.error}`);
      }
    } catch {
      alert("An error occurred while retrying");
    } finally {
      setRetrying(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const paperId = active.id as string;

    if (over.id === "unfiled") {
      await fetch(`/api/papers/${paperId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: null }),
      });
      setPapers((prev) => prev.map((p) => (p._id === paperId ? { ...p, folderId: undefined } : p)));
      return;
    }

    const folderTargetId = String(over.id).replace("folder-", "");
    if (folderTargetId !== over.id) {
      await fetch(`/api/papers/${paperId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderTargetId }),
      });
      setPapers((prev) => prev.map((p) => (p._id === paperId ? { ...p, folderId: folderTargetId } : p)));

      if (selectedFolderId && selectedFolderId !== folderTargetId) {
        setPapers((prev) => prev.filter((p) => p._id !== paperId));
      }
      return;
    }

    const activeIdx = folders.findIndex((f) => f._id === active.id);
    const overIdx = folders.findIndex((f) => f._id === over.id);
    if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;

    const reordered = [...folders];
    const [moved] = reordered.splice(activeIdx, 1);
    reordered.splice(overIdx, 0, moved);

    const updated = reordered.map((f, i) => ({ ...f, order: i }));
    setFolders(updated);

    await fetch("/api/folders/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: updated.map((f) => f._id) }),
    });
  };

  const getFolderColor = (paper: Paper): string | undefined => {
    if (!paper.folderId) return undefined;
    const folder = folders.find((f) => f._id === paper.folderId);
    return folder?.color;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-8 max-w-screen-xl">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Papers
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
              style={{
                background: "var(--bg-tertiary)",
                border: "0.5px solid var(--border-primary)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                padding: "4px 8px",
                minHeight: "32px",
              }}
            >
              Folders
            </button>
          </div>
          <Link href="/papers/new" style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 12px",
            background: "var(--accent)",
            color: "white",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            minHeight: "44px",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}>
            New Paper
          </Link>
        </div>

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
            <div style={{ marginBottom: "24px" }}>
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "processing", "completed", "failed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "0.5px solid var(--border-primary)",
                      background: statusFilter === status ? "var(--accent)" : "var(--bg-tertiary)",
                      color: statusFilter === status ? "white" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                      minHeight: "44px",
                    }}
                    onMouseEnter={(e) => {
                      if (statusFilter !== status) {
                        e.currentTarget.style.background = "var(--bg-elevated)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (statusFilter !== status) {
                        e.currentTarget.style.background = "var(--bg-tertiary)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

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
                No papers found.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {papers.map((paper) => (
                  <PaperCard
                    key={paper._id}
                    paper={paper}
                    folderColor={getFolderColor(paper)}
                    onRetry={retryPaper}
                    onFolderAssigned={(paperId, folderId) => {
                      setPapers((prev) =>
                        prev.map((p) =>
                          p._id === paperId ? { ...p, folderId: folderId ?? undefined } : p
                        )
                      );
                      if (selectedFolderId && selectedFolderId !== folderId) {
                        setPapers((prev) => prev.filter((p) => p._id !== paperId));
                      }
                    }}
                    isRetrying={retrying === paper._id}
                    folders={folders}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
