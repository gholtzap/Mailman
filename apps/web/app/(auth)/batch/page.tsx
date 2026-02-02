"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POPULAR_CATEGORIES = [
  { id: "cs.AI", name: "Artificial Intelligence" },
  { id: "cs.LG", name: "Machine Learning" },
  { id: "cs.CV", name: "Computer Vision" },
  { id: "cs.CL", name: "Computation and Language" },
  { id: "cs.RO", name: "Robotics" },
  { id: "cs.CR", name: "Cryptography and Security" },
  { id: "cs.DB", name: "Databases" },
  { id: "cs.SE", name: "Software Engineering" },
];

export default function BatchScrapePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [papersPerCategory, setPapersPerCategory] = useState(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      setMessage("Please select at least one category");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/processing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          papersPerCategory,
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const error = await res.json();
        console.error('[Frontend] Batch processing failed:', error);
        setMessage(`Failed to start batch processing: ${error.details || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Frontend] Unexpected error:', error);
      setMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-screen-lg">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard" style={{
          fontSize: '13px',
          color: 'var(--accent)',
          textDecoration: 'none',
          transition: 'color 150ms cubic-bezier(0.25, 1, 0.5, 1)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent)'}>
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '24px' }}>
        Batch Process Papers
      </h1>

      <div style={{
        background: 'var(--warning-muted)',
        border: '0.5px solid var(--warning)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '24px'
      }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
          This will fetch recent papers from the selected categories and queue them for processing.
          Each paper will use your Anthropic API credits.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Select Categories ({selectedCategories.length} selected)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POPULAR_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: `0.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-primary)'}`,
                    background: isSelected ? 'var(--accent-muted)' : 'var(--bg-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                    minHeight: '44px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.borderColor = 'var(--border-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                    }
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text-primary)', marginBottom: '2px' }}>
                    {category.name}
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-geist-mono)', color: 'var(--text-muted)' }}>
                    {category.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Papers Per Category
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={papersPerCategory}
            onChange={(e) => {
              let value = e.target.value;
              if (value.length > 1 && value.startsWith('0')) {
                value = value.replace(/^0+/, '');
              }
              setPapersPerCategory(Number(value) || 0);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-geist-mono)',
              fontVariantNumeric: 'tabular-nums',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-geist-mono)' }}>
            Total papers to process: {selectedCategories.length * papersPerCategory}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || selectedCategories.length === 0}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: (loading || selectedCategories.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (loading || selectedCategories.length === 0) ? 0.5 : 1,
            transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            minHeight: '44px'
          }}
          onMouseEnter={(e) => {
            if (!loading && selectedCategories.length > 0) e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            if (!loading && selectedCategories.length > 0) e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          {loading
            ? "Starting Batch Processing..."
            : `Process ${selectedCategories.length * papersPerCategory} Papers`}
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
          How Batch Processing Works:
        </h2>
        <ol style={{
          margin: 0,
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          <li>We fetch the most recent papers from each selected category</li>
          <li>Papers are queued for processing with Claude AI</li>
          <li>Processing happens in the background - you can close this page</li>
          <li>Check your dashboard to see progress and results</li>
          <li>Only papers under your configured page limit will be processed</li>
        </ol>
      </div>
    </div>
  );
}
