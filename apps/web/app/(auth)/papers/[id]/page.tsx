"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ProcessedPaper {
  _id: string;
  arxivId: string;
  status: string;
  generatedContent?: string;
  humanizedContent?: string;
  costs?: {
    opusInputTokens: number;
    opusOutputTokens: number;
    sonnetInputTokens: number;
    sonnetOutputTokens: number;
    estimatedCostUsd: number;
  };
  error?: string;
  createdAt: string;
}

interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: string;
  pageCount?: number;
}

export default function PaperDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [processedPaper, setProcessedPaper] = useState<ProcessedPaper | null>(null);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "technical" | "abstract">("summary");

  useEffect(() => {
    fetchPaper();
  }, [id]);

  const fetchPaper = async () => {
    const res = await fetch(`/api/papers/${id}`);
    const data = await res.json();
    setProcessedPaper(data.processedPaper);
    setPaper(data.paper);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  if (!processedPaper || !paper) {
    return (
      <div style={{ padding: '32px', maxWidth: '900px' }}>
        <div style={{
          background: 'var(--error-muted)',
          border: '0.5px solid var(--error)',
          borderRadius: '6px',
          padding: '16px',
          color: 'var(--error)',
          fontSize: '13px'
        }}>
          Paper not found
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/papers" style={{
          fontSize: '13px',
          color: 'var(--accent)',
          textDecoration: 'none',
          transition: 'color 150ms cubic-bezier(0.25, 1, 0.5, 1)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent)'}>
          &larr; Back to Papers
        </Link>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--border-primary)',
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {paper.title}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Authors:</span>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{paper.authors.join(", ")}</span>
          </div>
          <div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>arXiv ID:</span>{' '}
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent)',
                textDecoration: 'none',
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              {processedPaper.arxivId}
            </a>
          </div>
          <div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Categories:</span>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{paper.categories.join(", ")}</span>
          </div>
          {paper.pageCount && (
            <div>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Pages:</span>{' '}
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>{paper.pageCount}</span>
            </div>
          )}
          <div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Published:</span>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{new Date(paper.publishedDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Status:</span>{' '}
            <StatusBadge status={processedPaper.status} />
          </div>
          {processedPaper.costs && (
            <div>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Cost:</span>{' '}
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)', fontSize: '12px' }}>
                ${processedPaper.costs.estimatedCostUsd.toFixed(4)} (Opus: {processedPaper.costs.opusInputTokens.toLocaleString()}in / {processedPaper.costs.opusOutputTokens.toLocaleString()}out, Sonnet: {processedPaper.costs.sonnetInputTokens.toLocaleString()}in / {processedPaper.costs.sonnetOutputTokens.toLocaleString()}out)
              </span>
            </div>
          )}
        </div>
      </div>

      {processedPaper.status === "failed" && processedPaper.error && (
        <div style={{
          background: 'var(--error-muted)',
          border: '0.5px solid var(--error)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--error)', marginBottom: '8px' }}>Error</h2>
          <p style={{ fontSize: '13px', color: 'var(--error)', margin: 0 }}>{processedPaper.error}</p>
        </div>
      )}

      {processedPaper.status === "completed" && (
        <>
          <div style={{
            borderBottom: '0.5px solid var(--border-primary)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
                Summary (Humanized)
              </TabButton>
              <TabButton active={activeTab === "technical"} onClick={() => setActiveTab("technical")}>
                Technical (Generated)
              </TabButton>
              <TabButton active={activeTab === "abstract"} onClick={() => setActiveTab("abstract")}>
                Abstract
              </TabButton>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '6px',
            padding: '20px'
          }}>
            {activeTab === "summary" && (
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {processedPaper.humanizedContent}
              </pre>
            )}

            {activeTab === "technical" && (
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {processedPaper.generatedContent}
              </pre>
            )}

            {activeTab === "abstract" && (
              <p style={{
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {paper.abstract}
              </p>
            )}
          </div>
        </>
      )}

      {processedPaper.status === "processing" && (
        <div style={{
          background: 'var(--accent-muted)',
          border: '0.5px solid var(--accent)',
          borderRadius: '6px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Processing...
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            This paper is currently being processed. Check back soon.
          </p>
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
      padding: '3px 8px',
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 500,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
        marginBottom: '-0.5px'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
