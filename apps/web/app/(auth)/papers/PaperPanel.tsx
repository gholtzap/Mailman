"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBadge from "./StatusBadge";
import { getCategoryDisplayName, getSourceLabel } from "@/lib/categories";

interface ProcessedPaper {
  _id: string;
  arxivId: string;
  status: string;
  generatedContent?: string;
  costs?: {
    opusInputTokens: number;
    opusOutputTokens: number;
    sonnetInputTokens: number;
    sonnetOutputTokens: number;
    estimatedCostUsd: number;
  };
  error?: string;
}

interface PaperMeta {
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: string;
  pageCount?: number;
  source?: "arxiv" | "medrxiv";
}

interface PaperPanelProps {
  paperId: string;
  onClose: () => void;
}

export default function PaperPanel({ paperId, onClose }: PaperPanelProps) {
  const [processedPaper, setProcessedPaper] = useState<ProcessedPaper | null>(null);
  const [paper, setPaper] = useState<PaperMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"technical" | "abstract">("technical");

  useEffect(() => {
    let cancelled = false;
    const fetchPaper = async () => {
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      if (!cancelled) {
        setProcessedPaper(data.processedPaper);
        setPaper(data.paper);
        setLoading(false);
        setActiveTab("technical");
      }
    };
    fetchPaper();
    return () => { cancelled = true; };
  }, [paperId]);

  return (
    <div
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "0.5px solid var(--border-primary)",
        background: "var(--bg-primary)",
      }}
    >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "0.5px solid var(--border-primary)",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "none"; }}
          >
            x
          </button>
          <Link
            href={`/papers/${paperId}`}
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              textDecoration: "none",
              border: "0.5px solid var(--border-primary)",
              borderRadius: "4px",
              padding: "4px 10px",
              background: "var(--bg-tertiary)",
              transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}
          >
            Open
          </Link>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", minHeight: 0 }}>
          {loading ? (
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", padding: "60px 0" }}>
              Loading...
            </div>
          ) : !processedPaper || !paper ? (
            <div style={{
              background: "var(--error-muted)",
              border: "0.5px solid var(--error)",
              borderRadius: "6px",
              padding: "16px",
              color: "var(--error)",
              fontSize: "13px",
            }}>
              Paper not found
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "16px", lineHeight: 1.3 }}>
                {paper.title}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
                <MetaRow label="Authors">
                  <span style={{ color: "var(--text-primary)" }}>{paper.authors.join(", ")}</span>
                </MetaRow>
                <MetaRow label={getSourceLabel(paper.source)}>
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-geist-mono)", fontSize: "12px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                  >
                    {processedPaper.arxivId}
                  </a>
                </MetaRow>
                <MetaRow label="Categories">
                  <span style={{ color: "var(--text-primary)" }}>{paper.categories.map(getCategoryDisplayName).join(", ")}</span>
                </MetaRow>
                {paper.pageCount && (
                  <MetaRow label="Pages">
                    <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)" }}>{paper.pageCount}</span>
                  </MetaRow>
                )}
                <MetaRow label="Published">
                  <span style={{ color: "var(--text-primary)" }}>{new Date(paper.publishedDate).toLocaleDateString()}</span>
                </MetaRow>
                <MetaRow label="Status">
                  <StatusBadge status={processedPaper.status} />
                </MetaRow>
                {processedPaper.costs && (
                  <MetaRow label="Cost">
                    <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)", fontSize: "12px" }}>
                      ${processedPaper.costs.estimatedCostUsd.toFixed(4)}
                    </span>
                  </MetaRow>
                )}
              </div>

              {processedPaper.status === "failed" && processedPaper.error && (
                <div style={{
                  background: "var(--error-muted)",
                  border: "0.5px solid var(--error)",
                  borderRadius: "6px",
                  padding: "12px 16px",
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--error)", marginBottom: "4px" }}>Error</div>
                  <div style={{ fontSize: "13px", color: "var(--error)" }}>{processedPaper.error}</div>
                </div>
              )}

              {(processedPaper.status === "processing" || processedPaper.status === "pending") && (
                <div style={{
                  background: "var(--bg-tertiary)",
                  border: "0.5px solid var(--border-primary)",
                  borderRadius: "6px",
                  padding: "24px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                    {processedPaper.status === "processing" ? "Processing..." : "Pending"}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {processedPaper.status === "processing"
                      ? "This paper is currently being processed."
                      : "This paper is queued for processing."}
                  </div>
                </div>
              )}

              {processedPaper.status === "completed" && (() => {
                const hasAiSummary = processedPaper.generatedContent
                  && !processedPaper.generatedContent.startsWith("--- Page");
                const effectiveTab = hasAiSummary ? activeTab : "abstract";

                return (
                  <>
                    {hasAiSummary && (
                      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border-primary)", marginBottom: "16px" }}>
                        {(["technical", "abstract"] as const).map((tab) => {
                          const labels = { technical: "Summary", abstract: "Abstract" };
                          const isActive = activeTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              style={{
                                padding: "8px 12px",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                                background: "transparent",
                                border: "none",
                                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                                cursor: "pointer",
                                marginBottom: "-0.5px",
                                whiteSpace: "nowrap",
                                transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                              }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-primary)"; }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
                            >
                              {labels[tab]}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-primary)" }}>
                      {effectiveTab === "abstract" ? (
                        <p style={{ margin: 0 }}>{paper.abstract}</p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}: any) => <h1 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", paddingBottom: "8px", borderBottom: "0.5px solid var(--border-primary)" }} {...props} />,
                            h2: ({node, ...props}: any) => <h2 style={{ fontSize: "16px", fontWeight: 600, marginTop: "18px", marginBottom: "10px" }} {...props} />,
                            h3: ({node, ...props}: any) => <h3 style={{ fontSize: "14px", fontWeight: 600, marginTop: "14px", marginBottom: "8px" }} {...props} />,
                            p: ({node, ...props}: any) => <p style={{ marginBottom: "10px" }} {...props} />,
                            ul: ({node, ...props}: any) => <ul style={{ marginBottom: "10px", paddingLeft: "20px" }} {...props} />,
                            ol: ({node, ...props}: any) => <ol style={{ marginBottom: "10px", paddingLeft: "20px" }} {...props} />,
                            li: ({node, ...props}: any) => <li style={{ margin: "4px 0" }} {...props} />,
                            code: ({node, inline, ...props}: any) => inline
                              ? <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: "12px", background: "var(--bg-tertiary)", border: "0.5px solid var(--border-primary)", padding: "2px 6px", borderRadius: "3px" }} {...props} />
                              : <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: "12px" }} {...props} />,
                            pre: ({node, ...props}: any) => <pre style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-primary)", borderRadius: "6px", padding: "10px", marginBottom: "10px", overflowX: "auto" }} {...props} />,
                          }}
                        >
                          {processedPaper.generatedContent || ""}
                        </ReactMarkdown>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "13px" }}>
      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}: </span>
      {children}
    </div>
  );
}

