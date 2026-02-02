"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Paper {
  _id: string;
  arxivId: string;
  status: string;
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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchPapers();
  }, [statusFilter]);

  const fetchPapers = async () => {
    const url = statusFilter === "all"
      ? "/api/papers"
      : `/api/papers?status=${statusFilter}`;

    const res = await fetch(url);
    const data = await res.json();
    setPapers(data.papers);
    setLoading(false);
  };

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
    } catch (error) {
      alert("An error occurred while retrying");
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Papers
        </h1>
        <Link href="/papers/new" style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--accent)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background 150ms cubic-bezier(0.25, 1, 0.5, 1)',
          minHeight: '44px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}>
          New Paper
        </Link>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "processing", "completed", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                border: '0.5px solid var(--border-primary)',
                background: statusFilter === status ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: statusFilter === status ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                minHeight: '44px'
              }}
              onMouseEnter={(e) => {
                if (statusFilter !== status) {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (statusFilter !== status) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
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
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '32px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          No papers found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {papers.map((paper) => (
            <Link
              key={paper._id}
              href={`/papers/${paper._id}`}
              style={{
                display: 'block',
                background: 'var(--bg-secondary)',
                border: '0.5px solid var(--border-primary)',
                borderRadius: '6px',
                padding: '16px',
                textDecoration: 'none',
                transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {paper.paper?.title || paper.arxivId}
                  </h3>
                  {paper.paper?.authors && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {paper.paper.authors.slice(0, 3).join(", ")}
                      {paper.paper.authors.length > 3 && " et al."}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {paper.paper?.categories?.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        style={{
                          padding: '2px 6px',
                          background: 'var(--bg-tertiary)',
                          border: '0.5px solid var(--border-secondary)',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: 500,
                          borderRadius: '3px'
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex sm:flex-col justify-between sm:justify-start items-start sm:text-right sm:min-w-[120px]">
                  <StatusBadge status={paper.status} />
                  {paper.status === 'failed' && (
                    <button
                      onClick={(e) => retryPaper(paper._id, e)}
                      disabled={retrying === paper._id}
                      style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: 'var(--accent)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: retrying === paper._id ? 'not-allowed' : 'pointer',
                        opacity: retrying === paper._id ? 0.5 : 1,
                        transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                        width: '100%',
                        minHeight: '44px'
                      }}
                      onMouseEnter={(e) => {
                        if (retrying !== paper._id) {
                          e.currentTarget.style.background = 'var(--accent-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (retrying !== paper._id) {
                          e.currentTarget.style.background = 'var(--accent)';
                        }
                      }}
                    >
                      {retrying === paper._id ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                  {paper.costs && (
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
                      ${paper.costs.estimatedCostUsd.toFixed(4)}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(paper.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    completed: { bg: 'var(--success-muted)', text: 'var(--success)' },
    failed: { bg: 'var(--error-muted)', text: 'var(--error)' },
    processing: { bg: 'var(--warning-muted)', text: 'var(--warning)' },
    pending: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' }
  };

  const color = colors[status as keyof typeof colors] || colors.pending;

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      background: color.bg,
      color: color.text,
      fontSize: '11px',
      fontWeight: 500,
      borderRadius: '4px'
    }}>
      {status}
    </span>
  );
}
