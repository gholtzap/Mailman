"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCategoryDisplayName, getSourceLabel, getExternalPaperUrl } from "@/lib/categories";

interface PaperData {
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: string;
  pageCount?: number;
  source?: "arxiv" | "medrxiv";
  arxivId: string;
}

export default function PublicPaperPage() {
  const params = useParams();
  const slug = params.slug as string[];
  const arxivId = slug.join("/");

  const [paper, setPaper] = useState<PaperData | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "abstract">("summary");

  useEffect(() => {
    const fetchPaper = async () => {
      const res = await fetch(`/api/public/papers/${arxivId}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPaper(data.paper);
      setSummary(data.summary);
      setLoading(false);
    };
    fetchPaper();
  }, [arxivId]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <PublicHeader />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (notFound || !paper) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <PublicHeader />
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
            Paper not found
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            This paper may not have been processed yet, or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const externalUrl = getExternalPaperUrl(paper.arxivId, paper.source);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <PublicHeader />

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <h1 style={{
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "16px",
            lineHeight: 1.3,
          }}>
            {paper.title}
          </h1>

          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Authors:</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>{paper.authors.join(", ")}</span>
            </div>
            <div>
              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
                {paper.source === "medrxiv" ? "DOI:" : "arXiv ID:"}
              </span>{" "}
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "12px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                {paper.arxivId}
              </a>
              <span style={{
                marginLeft: "8px",
                padding: "1px 6px",
                background: "var(--bg-tertiary)",
                border: "0.5px solid var(--border-secondary)",
                borderRadius: "3px",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-muted)",
              }}>
                {getSourceLabel(paper.source)}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Categories:</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {paper.categories.map(getCategoryDisplayName).join(", ")}
              </span>
            </div>
            {paper.pageCount && (
              <div>
                <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Pages:</span>{" "}
                <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)" }}>
                  {paper.pageCount}
                </span>
              </div>
            )}
            <div>
              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Published:</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {new Date(paper.publishedDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "4px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "var(--bg-tertiary)",
                  border: "0.5px solid var(--border-primary)",
                  borderRadius: "4px",
                  textDecoration: "none",
                  transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
              >
                View PDF
              </a>
            </div>
          </div>
        </div>

        <div style={{ borderBottom: "0.5px solid var(--border-primary)", marginBottom: "24px" }}>
          <div className="flex gap-2 overflow-x-auto">
            <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
              Summary
            </TabButton>
            <TabButton active={activeTab === "abstract"} onClick={() => setActiveTab("abstract")}>
              Abstract
            </TabButton>
          </div>
        </div>

        <div style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border-primary)",
          borderRadius: "6px",
          padding: "20px",
        }}>
          {activeTab === "summary" && summary && (
            <div className="markdown-content" style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: "14px",
              lineHeight: "1.7",
              color: "var(--text-primary)",
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }: any) => <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px", paddingBottom: "12px", borderBottom: "0.5px solid var(--border-primary)" }} {...props} />,
                  h2: ({ node, ...props }: any) => <h2 style={{ fontSize: "18px", fontWeight: 600, marginTop: "24px", marginBottom: "12px" }} {...props} />,
                  h3: ({ node, ...props }: any) => <h3 style={{ fontSize: "16px", fontWeight: 600, marginTop: "20px", marginBottom: "10px" }} {...props} />,
                  p: ({ node, ...props }: any) => <p style={{ marginBottom: "12px" }} {...props} />,
                  ul: ({ node, ...props }: any) => <ul style={{ marginBottom: "12px", paddingLeft: "24px" }} {...props} />,
                  ol: ({ node, ...props }: any) => <ol style={{ marginBottom: "12px", paddingLeft: "24px" }} {...props} />,
                  li: ({ node, ...props }: any) => <li style={{ margin: "6px 0" }} {...props} />,
                  code: ({ node, inline, ...props }: any) => inline
                    ? <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: "13px", background: "var(--bg-tertiary)", border: "0.5px solid var(--border-primary)", padding: "2px 6px", borderRadius: "3px" }} {...props} />
                    : <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: "13px" }} {...props} />,
                  pre: ({ node, ...props }: any) => <pre style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-primary)", borderRadius: "6px", padding: "12px", marginBottom: "12px", overflowX: "auto" }} {...props} />,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          )}

          {activeTab === "summary" && !summary && (
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
              No summary available for this paper.
            </p>
          )}

          {activeTab === "abstract" && (
            <p style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "var(--text-primary)",
              margin: 0,
            }}>
              {paper.abstract}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicHeader() {
  return (
    <nav
      className="mx-auto px-4 md:px-8 py-4 flex justify-between items-center"
      style={{
        borderBottom: "0.5px solid var(--border-primary)",
        maxWidth: "820px",
      }}
    >
      <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
        <Image src="/mailman-logo.png" alt="Mailman" width={24} height={24} />
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          Mailman
        </span>
      </Link>
    </nav>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        fontSize: "13px",
        fontWeight: 500,
        color: active ? "var(--accent)" : "var(--text-secondary)",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
        marginBottom: "-0.5px",
        minHeight: "44px",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {children}
    </button>
  );
}
