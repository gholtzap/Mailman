"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ARXIV_CATEGORIES, POPULAR_CATEGORY_IDS } from "@/lib/arxiv-categories";
import { MEDRXIV_CATEGORIES } from "@/lib/medrxiv-categories";
import Modal from "@/app/components/Modal";

const POPULAR_CATEGORIES = ARXIV_CATEGORIES.flatMap(section =>
  section.categories.filter(cat => POPULAR_CATEGORY_IDS.has(cat.id))
);

const ALL_CATEGORY_SECTIONS = [
  ...ARXIV_CATEGORIES,
  { section: "Medicine (medRxiv)", categories: MEDRXIV_CATEGORIES.map(c => ({ id: c.id, name: c.name })) },
];

export default function BatchScrapePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [papersPerCategory, setPapersPerCategory] = useState(5);
  const [skipAI, setSkipAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setUserEmail(data.email || ""));
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = useMemo(() =>
    ALL_CATEGORY_SECTIONS.map(section => ({
      ...section,
      categories: section.categories.filter(cat => {
        if (!categoryFilter) return true;
        const filter = categoryFilter.toLowerCase();
        return cat.id.toLowerCase().includes(filter) || cat.name.toLowerCase().includes(filter);
      })
    })).filter(section => section.categories.length > 0),
    [categoryFilter]
  );

  const submitBatch = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/processing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          papersPerCategory,
          skipAI,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      setMessage("Please select at least one category");
      return;
    }

    if (!userEmail) {
      setShowEmailModal(true);
      return;
    }

    await submitBatch();
  };

  const handleModalSubmit = async () => {
    if (!modalEmail || !modalEmail.includes("@")) {
      setModalError("Please enter a valid email address");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: modalEmail }),
      });

      if (!res.ok) {
        const error = await res.json();
        setModalError(error.error || "Failed to save email");
        return;
      }

      setUserEmail(modalEmail);
      setShowEmailModal(false);
      await submitBatch();
    } catch {
      setModalError("Failed to save email");
    } finally {
      setModalLoading(false);
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
          {skipAI
            ? 'This will fetch recent papers from the selected categories and extract raw text only (no AI processing, no cost).'
            : 'This will fetch recent papers from the selected categories and queue them for processing. Each paper will use your Anthropic API credits.'}
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

          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Search all categories..."
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              marginTop: '12px',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          />

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '8px',
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '6px'
          }}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No categories match your search
              </div>
            ) : (
              filteredCategories.map(section => (
                <div key={section.section} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    paddingBottom: '4px',
                    borderBottom: '0.5px solid var(--border-primary)'
                  }}>
                    {section.section}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {section.categories.map(category => (
                      <label
                        key={category.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: 'var(--accent)',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>
                            {category.id}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            {category.name}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
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
            value={papersPerCategory || ''}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              setPapersPerCategory(isNaN(parsed) ? 0 : Math.min(parsed, 20));
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
            placeholder="5"
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              if (!papersPerCategory) setPapersPerCategory(1);
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-geist-mono)' }}>
            Total papers to process: {selectedCategories.length * papersPerCategory}
          </p>
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

      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Add Notification Email"
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Enter your email to receive a notification when batch processing completes.
        </p>
        <input
          type="email"
          value={modalEmail}
          onChange={(e) => setModalEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-primary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            marginBottom: '16px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleModalSubmit();
            }
          }}
        />
        {modalError && (
          <p style={{ fontSize: '12px', color: 'var(--error)', marginBottom: '12px' }}>
            {modalError}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowEmailModal(false)}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleModalSubmit}
            disabled={modalLoading || !modalEmail}
            style={{
              padding: '8px 12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: (modalLoading || !modalEmail) ? 'not-allowed' : 'pointer',
              opacity: (modalLoading || !modalEmail) ? 0.5 : 1,
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
              minHeight: '44px',
            }}
            onMouseEnter={(e) => {
              if (!modalLoading && modalEmail) e.currentTarget.style.background = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              if (!modalLoading && modalEmail) e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            {modalLoading ? "Saving..." : "Save & Submit"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
