"use client";

import { useState, useEffect, useCallback } from "react";
import StatusBadge from "../papers/StatusBadge";

interface Job {
  _id: string;
  type: "single_paper" | "batch_scrape";
  status: "queued" | "running" | "completed" | "failed";
  input: {
    arxivUrl?: string;
    arxivId?: string;
    categories?: string[];
    papersPerCategory?: number;
    keywords?: string[];
    keywordMatchMode?: "any" | "all";
    skipAI?: boolean;
  };
  progress: {
    total: number;
    completed: number;
  };
  result?: {
    totalFetched: number;
    totalPapersQueued: number;
    alreadyProcessedCount: number;
    filteredCount: number;
    categoriesSucceeded: number;
    categoriesFailed: number;
  };
  createdAt: string;
  updatedAt?: string;
}

interface JobsData {
  jobs: Job[];
}

export default function JobsClient({ initialData }: { initialData: JobsData }) {
  const [jobs, setJobs] = useState<Job[]>(initialData.jobs);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);

    const url = params.toString() ? `/api/jobs?${params}` : "/api/jobs";
    const res = await fetch(url);
    const data = await res.json();
    setJobs(data.jobs);
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const retryJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to retry job");
      }
      await fetchJobs();
    } finally {
      setActionLoading(null);
    }
  };

  const cancelJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to cancel job");
      }
      await fetchJobs();
    } finally {
      setActionLoading(null);
    }
  };

  const getJobLabel = (job: Job): string => {
    if (job.type === "single_paper") {
      return job.input.arxivId || job.input.arxivUrl?.split("/abs/")[1] || "Single Paper";
    }
    return job.input.categories?.join(", ") || "Batch Scrape";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Jobs
        </h1>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "4px",
              color: "var(--text-primary)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <option value="all">All Types</option>
            <option value="single_paper">Single Paper</option>
            <option value="batch_scrape">Batch Scrape</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              background: "var(--bg-secondary)",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "4px",
              color: "var(--text-primary)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          padding: "32px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}>
          No jobs found.
        </div>
      ) : (
        <div style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          overflow: "hidden",
        }}>
          {jobs.map((job, i) => {
            const progressPct = job.progress.total > 0
              ? (job.progress.completed / job.progress.total) * 100
              : 0;
            const isActive = job.status === "queued" || job.status === "running";
            const canRetry = job.status === "queued" || job.status === "failed";
            const canCancel = job.status !== "running";

            return (
              <div
                key={job._id}
                style={{
                  padding: "14px 16px",
                  borderBottom: i < jobs.length - 1 ? "0.5px solid var(--border-secondary)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: job.type === "batch_scrape" ? "var(--accent-muted)" : "var(--bg-tertiary)",
                        color: job.type === "batch_scrape" ? "var(--accent)" : "var(--text-muted)",
                        border: `0.5px solid ${job.type === "batch_scrape" ? "var(--accent)" : "var(--border-secondary)"}`,
                      }}>
                        {job.type === "single_paper" ? "Single" : "Batch"}
                      </span>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {getJobLabel(job)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
                      <StatusBadge status={job.status} />
                      <span style={{ fontFamily: "var(--font-geist-mono)", fontVariantNumeric: "tabular-nums" }}>
                        {job.progress.completed}/{job.progress.total}
                      </span>
                      {job.input.skipAI && (
                        <span style={{
                          fontSize: "10px",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          background: "var(--bg-tertiary)",
                          border: "0.5px solid var(--border-secondary)",
                          color: "var(--text-muted)",
                        }}>
                          Skip AI
                        </span>
                      )}
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {job.result && job.status === "completed" && (
                      <div style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "6px",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-geist-mono)",
                      }}>
                        <span>fetched: {job.result.totalFetched}</span>
                        <span>queued: {job.result.totalPapersQueued}</span>
                        {job.result.alreadyProcessedCount > 0 && (
                          <span>skipped: {job.result.alreadyProcessedCount}</span>
                        )}
                        {job.result.filteredCount > 0 && (
                          <span>filtered: {job.result.filteredCount}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {canRetry && (
                      <button
                        onClick={() => retryJob(job._id)}
                        disabled={actionLoading === job._id}
                        style={{
                          padding: "4px 8px",
                          background: "var(--accent)",
                          border: "none",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          cursor: actionLoading === job._id ? "not-allowed" : "pointer",
                          opacity: actionLoading === job._id ? 0.5 : 1,
                          transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== job._id) e.currentTarget.style.background = "var(--accent-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== job._id) e.currentTarget.style.background = "var(--accent)";
                        }}
                      >
                        {actionLoading === job._id ? "..." : "Retry"}
                      </button>
                    )}
                    {canCancel && job.status !== "completed" && (
                      <button
                        onClick={() => cancelJob(job._id)}
                        disabled={actionLoading === job._id}
                        style={{
                          padding: "4px 8px",
                          background: "var(--error-muted)",
                          border: "0.5px solid var(--error)",
                          color: "var(--error)",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          cursor: actionLoading === job._id ? "not-allowed" : "pointer",
                          opacity: actionLoading === job._id ? 0.5 : 1,
                          transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== job._id) {
                            e.currentTarget.style.background = "var(--error)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== job._id) {
                            e.currentTarget.style.background = "var(--error-muted)";
                            e.currentTarget.style.color = "var(--error)";
                          }
                        }}
                      >
                        {actionLoading === job._id ? "..." : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>

                {isActive && job.progress.total > 0 && (
                  <div style={{
                    background: "var(--bg-primary)",
                    borderRadius: "2px",
                    height: "4px",
                    overflow: "hidden",
                    marginTop: "10px",
                  }}>
                    <div style={{
                      background: "var(--accent)",
                      height: "100%",
                      width: `${progressPct}%`,
                      transition: "width 200ms cubic-bezier(0.25, 1, 0.5, 1)",
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
