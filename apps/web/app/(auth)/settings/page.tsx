"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [defaultCategories, setDefaultCategories] = useState<string[]>([]);
  const [maxPagesPerPaper, setMaxPagesPerPaper] = useState(50);
  const [papersPerCategory, setPapersPerCategory] = useState(5);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();

    setHasApiKey(data.hasApiKey);
    setApiKeyValid(data.apiKeyValid);
    setDefaultCategories(data.settings.defaultCategories);
    setMaxPagesPerPaper(data.settings.maxPagesPerPaper);
    setPapersPerCategory(data.settings.papersPerCategory);
  };

  const handleSaveApiKey = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (res.ok) {
        setMessage("API key saved successfully");
        setApiKey("");
        await fetchSettings();
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to save API key");
      }
    } catch (error) {
      setMessage("Failed to save API key");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm("Are you sure you want to delete your API key?")) return;

    setLoading(true);
    try {
      await fetch("/api/settings/api-key", { method: "DELETE" });
      setMessage("API key deleted");
      await fetchSettings();
    } catch (error) {
      setMessage("Failed to delete API key");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCategories,
          maxPagesPerPaper,
          papersPerCategory,
        }),
      });
      setMessage("Settings saved");
    } catch (error) {
      setMessage("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-screen-md">
      <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '32px' }}>
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Anthropic API Key
          </h2>

          {hasApiKey ? (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                API key is configured <span style={{
                  color: apiKeyValid ? 'var(--success)' : 'var(--error)',
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '11px'
                }}>
                  {apiKeyValid ? "(valid)" : "(invalid)"}
                </span>
              </p>
              <button
                onClick={handleDeleteApiKey}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                  minHeight: '44px'
                }}
              >
                Delete API Key
              </button>
            </div>
          ) : (
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-geist-mono)',
                  marginBottom: '12px',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
              <button
                onClick={handleSaveApiKey}
                disabled={loading || !apiKey}
                style={{
                  padding: '8px 12px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: (loading || !apiKey) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !apiKey) ? 0.5 : 1,
                  transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (!loading && apiKey) e.currentTarget.style.background = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!loading && apiKey) e.currentTarget.style.background = 'var(--accent)';
                }}
              >
                Save API Key
              </button>
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Processing Preferences
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Categories (comma-separated)
              </label>
              <input
                type="text"
                value={defaultCategories.join(", ")}
                onChange={(e) => setDefaultCategories(e.target.value.split(",").map(s => s.trim()))}
                placeholder="cs.AI, cs.LG"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Max Pages Per Paper
              </label>
              <input
                type="number"
                value={maxPagesPerPaper}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.length > 1 && value.startsWith('0')) {
                    value = value.replace(/^0+/, '');
                  }
                  setMaxPagesPerPaper(Number(value) || 0);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-geist-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Papers Per Category (batch scrape)
              </label>
              <input
                type="number"
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
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-geist-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={loading}
              style={{
                padding: '8px 12px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                alignSelf: 'flex-start',
                minHeight: '44px'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--accent)';
              }}
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '4px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
