"use client";

import React, { useState, useEffect } from "react";
import { RecurringSchedule, ProcessingJob } from "@/lib/types";
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories";
import { MEDRXIV_CATEGORIES } from "@/lib/medrxiv-categories";
import Modal from "@/app/components/Modal";

const ALL_CATEGORY_SECTIONS = [
  ...ARXIV_CATEGORIES,
  { section: "Medicine (medRxiv)", categories: MEDRXIV_CATEGORIES.map(c => ({ id: c.id, name: c.name })) },
];

const COMMON_TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
  { value: "America/Los_Angeles", label: "Pacific (PST)" },
  { value: "America/Denver", label: "Mountain (MST)" },
  { value: "America/Chicago", label: "Central (CST)" },
  { value: "America/New_York", label: "Eastern (EST)" },
  { value: "America/Sao_Paulo", label: "Brasilia (BRT)" },
  { value: "Atlantic/Reykjavik", label: "Iceland (GMT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Seoul", label: "Korea (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
  { value: "UTC", label: "UTC" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

function getScheduleLabel(schedule: RecurringSchedule): string {
  const type = schedule.scheduleType ?? "interval";
  if (type === "weekly" && schedule.weekDays && schedule.weekDays.length > 0) {
    const days = [...schedule.weekDays].sort((a, b) => a - b);
    return days.map((d) => DAY_LABELS[d]).join(", ");
  }
  const days = schedule.intervalDays;
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  if (days === 14) return "Bi-weekly";
  if (days === 30) return "Monthly";
  return `Every ${days} days`;
}

function getTimeLabel(schedule: RecurringSchedule): string {
  const hour = schedule.preferredHour ?? 6;
  const tz = schedule.timezone ?? "UTC";
  const shortTz = tz === "UTC" ? "UTC" : tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return `${formatHour(hour)} ${shortTz}`;
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function getTimezoneOptions(): { value: string; label: string }[] {
  const browserTz = getBrowserTimezone();
  const exists = COMMON_TIMEZONES.some((tz) => tz.value === browserTz);
  if (exists) return COMMON_TIMEZONES;
  const shortLabel = browserTz.split("/").pop()?.replace(/_/g, " ") ?? browserTz;
  return [{ value: browserTz, label: `${shortLabel} (Local)` }, ...COMMON_TIMEZONES];
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-primary)",
  border: "0.5px solid var(--border-primary)",
  borderRadius: "4px",
  color: "var(--text-primary)",
  fontSize: "13px",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const labelStyle = {
  display: "block" as const,
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-secondary)",
  marginBottom: "6px",
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [formName, setFormName] = useState("");
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formPapersPerCategory, setFormPapersPerCategory] = useState(5);
  const [formIntervalDays, setFormIntervalDays] = useState(1);
  const [formEmail, setFormEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<RecurringSchedule | null>(null);

  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [runs, setRuns] = useState<ProcessingJob[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const [formScheduleType, setFormScheduleType] = useState<"interval" | "weekly">("interval");
  const [formWeekDays, setFormWeekDays] = useState<number[]>([]);
  const [formPreferredHour, setFormPreferredHour] = useState(6);
  const [formTimezone, setFormTimezone] = useState(getBrowserTimezone());
  const [timezoneOptions] = useState(getTimezoneOptions);

  useEffect(() => {
    fetchSchedules();
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          setUserEmail(data.email);
          setFormEmail(data.email);
        }
      })
      .catch(() => {});
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      setMessage("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCategories([]);
    setFormPapersPerCategory(5);
    setFormIntervalDays(1);
    setFormEmail(userEmail);
    setFormScheduleType("interval");
    setFormWeekDays([]);
    setFormPreferredHour(6);
    setFormTimezone(getBrowserTimezone());
    setFieldErrors(new Set());
  };

  const buildPayload = () => {
    const payload: any = {
      name: formName,
      categories: formCategories,
      papersPerCategory: formPapersPerCategory,
      scheduleType: formScheduleType,
      preferredHour: formPreferredHour,
      timezone: formTimezone,
      email: formEmail.trim() || undefined,
    };
    if (formScheduleType === "interval") {
      payload.intervalDays = formIntervalDays;
    } else {
      payload.weekDays = formWeekDays;
    }
    return payload;
  };

  const handleCreate = async () => {
    const errors = new Set<string>();
    if (!formName.trim()) errors.add("name");
    if (formCategories.length === 0) errors.add("categories");
    if (formScheduleType === "weekly" && formWeekDays.length === 0) errors.add("weekDays");
    if (errors.size > 0) {
      setFieldErrors(errors);
      setMessage("Please fill in the highlighted fields");
      return;
    }

    setFieldErrors(new Set());
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.ok) {
        setMessage("Schedule created successfully");
        resetForm();
        await fetchSchedules();
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to create schedule");
      }
    } catch (error) {
      setMessage("Failed to create schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule: RecurringSchedule) => {
    setEditingId(schedule._id!.toString());
    setFormName(schedule.name);
    setFormCategories(schedule.categories);
    setFormPapersPerCategory(schedule.papersPerCategory);
    setFormIntervalDays(schedule.intervalDays);
    setFormEmail(schedule.email || "");
    setFormScheduleType(schedule.scheduleType ?? "interval");
    setFormWeekDays(schedule.weekDays ?? []);
    setFormPreferredHour(schedule.preferredHour ?? 6);
    setFormTimezone(schedule.timezone ?? "UTC");
  };

  const handleUpdate = async () => {
    const errors = new Set<string>();
    if (!formName.trim()) errors.add("name");
    if (formCategories.length === 0) errors.add("categories");
    if (formScheduleType === "weekly" && formWeekDays.length === 0) errors.add("weekDays");
    if (!editingId || errors.size > 0) {
      setFieldErrors(errors);
      setMessage("Please fill in the highlighted fields");
      return;
    }

    setFieldErrors(new Set());
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/schedules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.ok) {
        setMessage("Schedule updated successfully");
        setEditingId(null);
        resetForm();
        await fetchSchedules();
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to update schedule");
      }
    } catch (error) {
      setMessage("Failed to update schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const toggleCategory = (categoryId: string) => {
    setFormCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
    if (fieldErrors.has("categories")) setFieldErrors(prev => { const next = new Set(prev); next.delete("categories"); return next; });
  };

  const toggleWeekDay = (day: number) => {
    setFormWeekDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
    if (fieldErrors.has("weekDays")) setFieldErrors(prev => { const next = new Set(prev); next.delete("weekDays"); return next; });
  };

  const filteredCategories = ALL_CATEGORY_SECTIONS.map(section => ({
    ...section,
    categories: section.categories.filter(cat => {
      if (!categoryFilter) return true;
      const filter = categoryFilter.toLowerCase();
      return cat.id.toLowerCase().includes(filter) || cat.name.toLowerCase().includes(filter);
    })
  })).filter(section => section.categories.length > 0);

  const handleToggleStatus = async (schedule: RecurringSchedule) => {
    const newStatus = schedule.status === "active" ? "paused" : "active";

    try {
      const res = await fetch(`/api/schedules/${schedule._id!.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setMessage(`Schedule ${newStatus === "active" ? "resumed" : "paused"}`);
        await fetchSchedules();
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to update schedule");
      }
    } catch (error) {
      setMessage("Failed to update schedule");
    }
  };

  const handleDelete = async (schedule: RecurringSchedule) => {
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/schedules/${schedule._id!.toString()}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Schedule deleted");
        await fetchSchedules();
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to delete schedule");
      }
    } catch (error) {
      setMessage("Failed to delete schedule");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const toggleRuns = async (scheduleId: string) => {
    if (expandedScheduleId === scheduleId) {
      setExpandedScheduleId(null);
      setRuns([]);
      return;
    }
    setExpandedScheduleId(scheduleId);
    setRunsLoading(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/runs?limit=20`);
      const data = await res.json();
      setRuns(data.runs || []);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  const getRunResultLabel = (job: ProcessingJob) => {
    if (job.status === "failed" && !job.result) return "Failed";
    if (!job.result) return job.status === "running" ? "Running..." : "Pending";
    const { totalFetched, totalPapersQueued, alreadyProcessedCount, filteredCount } = job.result;
    if (totalPapersQueued > 0) return `${totalPapersQueued} new paper${totalPapersQueued === 1 ? "" : "s"} processed`;
    if (alreadyProcessedCount > 0) return `No new papers (${alreadyProcessedCount} already processed)`;
    if (filteredCount > 0) return `No papers matched keywords (${filteredCount} filtered)`;
    if (totalFetched === 0) return "No papers found";
    return "No new papers";
  };

  const getEmailLabel = (job: any) => {
    if (!job.emailResult) return "--";
    if (job.emailResult.skipped) return "Skipped";
    if (job.emailResult.error) return "Failed";
    if (job.emailResult.sent || job.emailResult.data) return "Sent";
    return "--";
  };

  const renderFormFields = (mode: "create" | "edit") => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
            if (fieldErrors.has("name")) setFieldErrors(prev => { const next = new Set(prev); next.delete("name"); return next; });
          }}
          placeholder="Daily AI Papers"
          style={{
            ...inputStyle,
            ...(fieldErrors.has("name") ? { borderColor: 'rgb(239, 68, 68)', borderWidth: '1.5px' } : {}),
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = fieldErrors.has("name") ? 'rgb(239, 68, 68)' : 'var(--accent)'}
          onBlur={(e) => e.currentTarget.style.borderColor = fieldErrors.has("name") ? 'rgb(239, 68, 68)' : 'var(--border-primary)'}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Categories {formCategories.length > 0 && `(${formCategories.length} selected)`}
        </label>
        <input
          type="text"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="Filter categories (e.g., machine learning, cs.AI, robotics)"
          style={{ ...inputStyle, marginBottom: '8px' }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        />
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '12px',
          background: 'var(--bg-primary)',
          border: fieldErrors.has("categories") ? '1.5px solid rgb(239, 68, 68)' : '0.5px solid var(--border-primary)',
          borderRadius: '4px'
        }}>
          {filteredCategories.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No categories match your filter
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '4px'
              }}>
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
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formCategories.includes(category.id)}
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
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>
                        {category.id}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {category.name}
                      </div>
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
        <label style={labelStyle}>Papers per Category</label>
        <input
          type="number"
          min="1"
          max="20"
          value={formPapersPerCategory || ''}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            setFormPapersPerCategory(isNaN(parsed) ? 0 : Math.min(parsed, 20));
          }}
          style={{
            ...inputStyle,
            fontFamily: 'var(--font-geist-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
          placeholder="5"
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            if (!formPapersPerCategory) setFormPapersPerCategory(1);
          }}
        />
      </div>

      <div>
        <label style={labelStyle}>Email for Summaries (optional)</label>
        <input
          type="email"
          value={formEmail}
          onChange={(e) => setFormEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Summaries will be sent to this email when processing completes
        </p>
      </div>

      <div>
        <label style={labelStyle}>Schedule Type</label>
        <div style={{ display: 'flex', gap: '0px' }}>
          <button
            type="button"
            onClick={() => setFormScheduleType("interval")}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: formScheduleType === "interval" ? 'var(--accent)' : 'var(--bg-primary)',
              color: formScheduleType === "interval" ? 'white' : 'var(--text-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '4px 0 0 4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            Every X days
          </button>
          <button
            type="button"
            onClick={() => setFormScheduleType("weekly")}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: formScheduleType === "weekly" ? 'var(--accent)' : 'var(--bg-primary)',
              color: formScheduleType === "weekly" ? 'white' : 'var(--text-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            Days of week
          </button>
        </div>
      </div>

      {formScheduleType === "interval" ? (
        <div>
          <label style={labelStyle}>Repeat every (days)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={formIntervalDays}
            onChange={(e) => {
              let value = e.target.value;
              if (value.length > 1 && value.startsWith('0')) {
                value = value.replace(/^0+/, '');
              }
              setFormIntervalDays(Number(value) || 0);
            }}
            style={{
              ...inputStyle,
              fontFamily: 'var(--font-geist-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          />
        </div>
      ) : (
        <div>
          <label style={labelStyle}>Days of week</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {DAY_LABELS.map((label, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleWeekDay(index)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: formWeekDays.includes(index) ? 'var(--accent)' : 'var(--bg-primary)',
                  color: formWeekDays.includes(index) ? 'white' : 'var(--text-secondary)',
                  border: fieldErrors.has("weekDays") && !formWeekDays.includes(index)
                    ? '1.5px solid rgb(239, 68, 68)'
                    : '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Time of day</label>
          <select
            value={formPreferredHour}
            onChange={(e) => setFormPreferredHour(Number(e.target.value))}
            style={selectStyle}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Timezone</label>
          <select
            value={formTimezone}
            onChange={(e) => setFormTimezone(e.target.value)}
            style={selectStyle}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {mode === "edit" ? (
          <>
            <button
              onClick={handleUpdate}
              disabled={saving}
              style={{
                padding: '8px 12px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                minHeight: '44px'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.background = 'var(--accent)';
              }}
            >
              Update Schedule
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '0.5px solid var(--border-primary)',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                minHeight: '44px'
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            style={{
              padding: '8px 12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            Create Schedule
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-screen-xl">
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '32px' }}>
          Recurring Schedules
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-xl">
      <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '32px' }}>
        Recurring Schedules
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            New Schedule
          </h2>

          {renderFormFields("create")}
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Your Schedules
          </h2>

          {schedules.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              No schedules yet. Create one above to get started.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Categories</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Schedule</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Next Run</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Runs</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <React.Fragment key={schedule._id!.toString()}>
                    <tr style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{schedule.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)', fontSize: '12px' }}>
                        {schedule.categories.join(", ")}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {schedule.email || <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>None</span>}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{getScheduleLabel(schedule)}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {getTimeLabel(schedule)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: schedule.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)',
                          color: schedule.status === 'active' ? 'rgb(34, 197, 94)' : 'var(--text-secondary)'
                        }}>
                          {schedule.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)', fontSize: '12px' }}>
                        {schedule.runCount === 0
                          ? "Pending first run"
                          : formatDate(schedule.nextRunAt)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <button
                          onClick={() => toggleRuns(schedule._id!.toString())}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-geist-mono)',
                            fontSize: '13px',
                            padding: 0,
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                          }}
                        >
                          {schedule.runCount}
                        </button>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(schedule)}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '0.5px solid var(--border-primary)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(schedule)}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '0.5px solid var(--border-primary)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
                            }}
                          >
                            {schedule.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(schedule)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: 'rgb(239, 68, 68)',
                              border: '0.5px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedScheduleId === schedule._id!.toString() && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0 8px 12px 8px', background: 'var(--bg-primary)' }}>
                          {runsLoading ? (
                            <div style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Loading run history...
                            </div>
                          ) : runs.length === 0 ? (
                            <div style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              No runs yet
                            </div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '4px' }}>
                              <thead>
                                <tr style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
                                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Result</th>
                                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                                </tr>
                              </thead>
                              <tbody>
                                {runs.map((run) => (
                                  <tr key={run._id!.toString()} style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)', whiteSpace: 'nowrap' }}>
                                      {formatDate(run.createdAt)}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: run.status === 'failed' ? 'rgb(239, 68, 68)' : 'var(--text-primary)' }}>
                                      {getRunResultLabel(run)}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                                      {getEmailLabel(run)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      <Modal
        isOpen={editingId !== null}
        onClose={handleCancelEdit}
        title="Edit Schedule"
        maxWidth="600px"
      >
        {renderFormFields("edit")}
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Schedule"
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteTarget(null)}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          >
            Cancel
          </button>
          <button
            onClick={() => deleteTarget && handleDelete(deleteTarget)}
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'rgb(239, 68, 68)',
              border: '0.5px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
