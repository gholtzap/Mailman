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
}

interface Job {
  _id: string;
  type: string;
  status: string;
  progress: {
    total: number;
    completed: number;
  };
  createdAt: string;
}

interface DashboardData {
  recentPapers: Paper[];
  activeJobs: Job[];
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
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    const res = await fetch("/api/dashboard");
    const dashboardData = await res.json();
    setData(dashboardData);
    setLoading(false);
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) {
      return;
    }

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  if (!data?.stats.hasApiKey) {
    return (
      <div className="p-4 md:p-8 max-w-screen-md">
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            API Key Required
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Configure your Anthropic API key before processing papers.
          </p>
          <Link href="/settings" style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 150ms cubic-bezier(0.25, 1, 0.5, 1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-xl">
      <div className="flex flex-wrap justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/batch" style={{
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
            Batch Process
          </Link>
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
                      {job.type === "single_paper" ? "Single Paper" : "Batch Scrape"}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {job.status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>
                      {job.progress.completed} / {job.progress.total}
                    </div>
                    {(job.status === "queued" || job.status === "failed") && (
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

        {data.recentPapers.length === 0 ? (
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
            {data.recentPapers.map((paper, i) => (
              <Link key={paper._id} href={`/papers/${paper._id}`} style={{
                display: 'block',
                padding: '12px',
                borderBottom: i < data.recentPapers.length - 1 ? '0.5px solid var(--border-secondary)' : 'none',
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
            ))}
          </div>
        )}
      </div>
    </div>
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
      padding: '2px 6px',
      background: color.bg,
      color: color.text,
      fontSize: '11px',
      fontWeight: 500,
      borderRadius: '3px'
    }}>
      {status}
    </span>
  );
}
