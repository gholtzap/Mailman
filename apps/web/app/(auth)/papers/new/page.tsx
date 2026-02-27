"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPaperPage() {
  const [arxivUrl, setArxivUrl] = useState("");
  const [skipAI, setSkipAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

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
          body: JSON.stringify({ paperId: data.paper._id, skipAI }),
        });

        if (processRes.ok) {
          router.push("/dashboard");
        } else {
          const processError = await processRes.json();
          console.error('[Frontend] Processing failed:', processError);
          setMessage(`Failed to queue processing job: ${processError.details || processError.error || 'Unknown error'}`);
        }
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to fetch paper");
      }
    } catch (error) {
      console.error('[Frontend] Unexpected error:', error);
      setMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '32px' }}>
        Add New Paper
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            arXiv or medRxiv URL
          </label>
          <input
            type="text"
            value={arxivUrl}
            onChange={(e) => setArxivUrl(e.target.value)}
            placeholder="arxiv.org/abs/2401.12345 or medrxiv.org/content/10.1101/..."
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font-geist-mono)'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="skipAI"
            checked={skipAI}
            onChange={(e) => setSkipAI(e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer',
              accentColor: 'var(--accent)',
            }}
          />
          <label
            htmlFor="skipAI"
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Skip AI processing (extract raw text only, no cost)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !arxivUrl}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: (loading || !arxivUrl) ? 'not-allowed' : 'pointer',
            opacity: (loading || !arxivUrl) ? 0.5 : 1,
            transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            minHeight: '44px'
          }}
          onMouseEnter={(e) => {
            if (!loading && arxivUrl) e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            if (!loading && arxivUrl) e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          {loading ? "Processing..." : "Fetch and Process Paper"}
        </button>
      </form>

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--error-muted)',
          border: '0.5px solid var(--error)',
          borderRadius: '6px',
          fontSize: '13px',
          color: 'var(--error)'
        }}>
          {message}
        </div>
      )}

      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--border-primary)',
        borderRadius: '6px'
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          How it works:
        </h2>
        <ol style={{
          margin: 0,
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          <li>Paste an arXiv or medRxiv URL (or arXiv paper ID)</li>
          <li>We fetch the paper metadata from the source</li>
          <li>The paper is queued for processing with Claude</li>
          <li>You can view results in your dashboard</li>
        </ol>
      </div>
    </div>
  );
}
