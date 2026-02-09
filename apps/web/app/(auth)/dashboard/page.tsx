"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "../papers/StatusBadge";

interface Paper {
  _id: string;
  arxivId: string;
  status: string;
  createdAt: string;
  costs?: {
    estimatedCostUsd: number;
  };
}

interface Job {
  _id: string;
  type: string;
  status: string;
  input: {
    arxivUrl?: string;
    categories?: string[];
  };
  progress: {
    total: number;
    completed: number;
  };
  createdAt: string;
  updatedAt?: string;
}

type TimelineItem =
  | { kind: "paper"; data: Paper }
  | { kind: "job"; data: Job };

interface DashboardData {
  recentPapers: Paper[];
  activeJobs: Job[];
  recentJobs: Job[];
  stats: {
    completedPapers: number;
    monthlyUsage: number;
    totalCost: number;
    hasApiKey: boolean;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const dashboardData = await res.json();

      if (!res.ok) {
        setError(dashboardData.message || dashboardData.error || "Failed to load dashboard");
        setLoading(false);
        return;
      }

      setData(dashboardData);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    setCancelling(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchDashboard();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to cancel job");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setCancelling(null);
    }
  };

  const retryJob = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
      });

      if (res.ok) {
        await fetchDashboard();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to retry job");
      }
    } catch (error) {
      alert("An error occurred");
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

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-screen-md">
        <div style={{
          background: 'var(--error-muted)',
          border: '0.5px solid var(--error)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--error)' }}>
            Error Loading Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchDashboard();
            }}
            style={{
              padding: '6px 12px',
              background: 'var(--error)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 150ms cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {!data.stats.hasApiKey && (
        <div className="p-4 md:p-8 max-w-screen-xl">
          <div style={{
            background: 'var(--warning-muted)',
            border: '0.5px solid var(--warning)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              No API key configured. Papers will be processed without AI summarization (raw text extraction only).{' '}
              <Link href="/settings" style={{
                color: 'var(--accent)',
                textDecoration: 'none',
                transition: 'color 150ms cubic-bezier(0.25, 1, 0.5, 1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent)'}>
                Add API key
              </Link>
            </p>
          </div>
        </div>
      )}

    <div className="p-4 md:p-8 max-w-screen-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { href: '/batch', label: '+Batch' },
            { href: '/schedules', label: '+Schedule' },
            { href: '/papers/new', label: '+Paper' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '0.5px solid var(--border-primary)',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 md:mb-8">
        <StatCard label="Completed Papers" value={data.stats.completedPapers} />
        <StatCard label="This Month" value={data.stats.monthlyUsage} />
        <StatCard label="Total Cost" value={`$${data.stats.totalCost.toFixed(2)}`} mono />
      </div>

      {data.activeJobs.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Active Jobs
          </h2>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            {data.activeJobs.map((job, i) => (
              <div key={job._id} style={{
                padding: '12px',
                borderBottom: i < data.activeJobs.length - 1 ? '0.5px solid var(--border-secondary)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {job.type === "single_paper"
                        ? (job.input.arxivUrl ? job.input.arxivUrl.split("/abs/")[1] : "Single Paper")
                        : (job.input.categories ? job.input.categories.join(", ") : "Batch Scrape")}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <StatusBadge status={job.status} />
                      <span style={{ marginLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>
                      {job.progress.completed} / {job.progress.total}
                    </div>
                    {(job.status === "queued" || job.status === "failed") && (
                      <>
                        <button
                          onClick={() => retryJob(job._id)}
                          disabled={retrying === job._id}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--accent)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: retrying === job._id ? 'not-allowed' : 'pointer',
                            opacity: retrying === job._id ? 0.5 : 1,
                            transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                          }}
                          onMouseEnter={(e) => {
                            if (retrying !== job._id) {
                              e.currentTarget.style.background = 'var(--accent-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (retrying !== job._id) {
                              e.currentTarget.style.background = 'var(--accent)';
                            }
                          }}
                        >
                          {retrying === job._id ? "Retrying..." : "Retry"}
                        </button>
                        <button
                          onClick={() => cancelJob(job._id)}
                          disabled={cancelling === job._id}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--error-muted)',
                            border: '0.5px solid var(--error)',
                            color: 'var(--error)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: cancelling === job._id ? 'not-allowed' : 'pointer',
                            opacity: cancelling === job._id ? 0.5 : 1,
                            transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                          }}
                          onMouseEnter={(e) => {
                            if (cancelling !== job._id) {
                              e.currentTarget.style.background = 'var(--error)';
                              e.currentTarget.style.color = 'white';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (cancelling !== job._id) {
                              e.currentTarget.style.background = 'var(--error-muted)';
                              e.currentTarget.style.color = 'var(--error)';
                            }
                          }}
                        >
                          {cancelling === job._id ? "Cancelling..." : "Cancel"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: '2px', height: '4px', overflow: 'hidden' }}>
                  <div style={{
                    background: 'var(--accent)',
                    height: '100%',
                    width: `${(job.progress.completed / job.progress.total) * 100}%`,
                    transition: 'width 200ms cubic-bezier(0.25, 1, 0.5, 1)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RecentTimeline
        recentPapers={data.recentPapers}
        recentJobs={data.recentJobs}
      />
    </div>
    </>
  );
}

function StatCard({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border-primary)',
      borderRadius: '6px',
      padding: '16px'
    }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-geist-mono)' : 'inherit',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </div>
    </div>
  );
}

function RecentTimeline({ recentPapers, recentJobs }: { recentPapers: Paper[]; recentJobs: Job[] }) {
  const timeline: TimelineItem[] = [
    ...recentPapers.map((p): TimelineItem => ({ kind: "paper", data: p })),
    ...recentJobs.map((j): TimelineItem => ({ kind: "job", data: j })),
  ]
    .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
    .slice(0, 10);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Papers</h2>
        <Link href="/papers" style={{
          fontSize: '13px',
          color: 'var(--accent)',
          textDecoration: 'none',
          transition: 'color 150ms cubic-bezier(0.25, 1, 0.5, 1)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent)'}>
          View All
        </Link>
      </div>

      {timeline.length === 0 ? (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '32px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          No papers processed yet.
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          {timeline.map((item, i) => {
            if (item.kind === "paper") {
              const paper = item.data;
              return (
                <Link key={`paper-${paper._id}`} href={`/papers/${paper._id}`} style={{
                  display: 'block',
                  padding: '12px',
                  borderBottom: i < timeline.length - 1 ? '0.5px solid var(--border-secondary)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontFamily: 'var(--font-geist-mono)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {paper.arxivId}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <StatusBadge status={paper.status} />
                        {paper.costs && (
                          <span style={{ marginLeft: '12px', fontFamily: 'var(--font-geist-mono)' }}>
                            ${paper.costs.estimatedCostUsd.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(paper.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            }

            const job = item.data as Job;
            return (
              <div key={`job-${job._id}`} style={{
                padding: '12px',
                borderBottom: i < timeline.length - 1 ? '0.5px solid var(--border-secondary)' : 'none',
                borderLeft: '3px solid var(--accent)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--accent)',
                      }}>
                        Batch
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {job.input.categories?.join(", ") || "Batch Scrape"}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <StatusBadge status={job.status} />
                      <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
                        {job.progress.completed} / {job.progress.total} papers
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

