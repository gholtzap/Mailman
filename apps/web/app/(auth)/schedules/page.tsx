"use client";

import { useState, useEffect } from "react";
import { RecurringSchedule } from "@/lib/types";

const INTERVAL_OPTIONS = [
  { label: "Daily", value: 1 },
  { label: "Every 3 days", value: 3 },
  { label: "Weekly", value: 7 },
  { label: "Bi-weekly", value: 14 },
  { label: "Monthly", value: 30 },
];

const ARXIV_CATEGORIES = [
  { section: "Computer Science", categories: [
    { id: "cs.AI", name: "Artificial Intelligence" },
    { id: "cs.LG", name: "Machine Learning" },
    { id: "cs.CV", name: "Computer Vision and Pattern Recognition" },
    { id: "cs.CL", name: "Computation and Language (NLP)" },
    { id: "cs.CR", name: "Cryptography and Security" },
    { id: "cs.RO", name: "Robotics" },
    { id: "cs.AR", name: "Hardware Architecture" },
    { id: "cs.DC", name: "Distributed, Parallel, and Cluster Computing" },
    { id: "cs.OS", name: "Operating Systems" },
    { id: "cs.NI", name: "Networking and Internet Architecture" },
    { id: "cs.PF", name: "Performance" },
    { id: "cs.SY", name: "Systems and Control" },
    { id: "cs.CC", name: "Computational Complexity" },
    { id: "cs.DS", name: "Data Structures and Algorithms" },
    { id: "cs.DM", name: "Discrete Mathematics" },
    { id: "cs.FL", name: "Formal Languages and Automata Theory" },
    { id: "cs.GT", name: "Computer Science and Game Theory" },
    { id: "cs.LO", name: "Logic in Computer Science" },
    { id: "cs.SE", name: "Software Engineering" },
    { id: "cs.PL", name: "Programming Languages" },
    { id: "cs.DB", name: "Databases" },
    { id: "cs.IR", name: "Information Retrieval" },
    { id: "cs.CG", name: "Computational Geometry" },
    { id: "cs.CY", name: "Computers and Society" },
    { id: "cs.GR", name: "Graphics" },
    { id: "cs.HC", name: "Human-Computer Interaction" },
    { id: "cs.IT", name: "Information Theory" },
    { id: "cs.MA", name: "Multiagent Systems" },
    { id: "cs.MM", name: "Multimedia" },
    { id: "cs.NE", name: "Neural and Evolutionary Computing" },
    { id: "cs.SC", name: "Symbolic Computation" },
    { id: "cs.SD", name: "Sound" },
    { id: "cs.SI", name: "Social and Information Networks" },
  ]},
  { section: "Mathematics", categories: [
    { id: "math.AG", name: "Algebraic Geometry" },
    { id: "math.AC", name: "Commutative Algebra" },
    { id: "math.GR", name: "Group Theory" },
    { id: "math.RT", name: "Representation Theory" },
    { id: "math.RA", name: "Rings and Algebras" },
    { id: "math.DG", name: "Differential Geometry" },
    { id: "math.GT", name: "Geometric Topology" },
    { id: "math.SG", name: "Symplectic Geometry" },
    { id: "math.AP", name: "Analysis of PDEs" },
    { id: "math.CA", name: "Classical Analysis and ODEs" },
    { id: "math.FA", name: "Functional Analysis" },
    { id: "math.CV", name: "Complex Variables" },
    { id: "math.SP", name: "Spectral Theory" },
    { id: "math.NA", name: "Numerical Analysis" },
    { id: "math.OC", name: "Optimization and Control" },
    { id: "math.PR", name: "Probability" },
    { id: "math.ST", name: "Statistics Theory" },
    { id: "math.DS", name: "Dynamical Systems" },
    { id: "math.CO", name: "Combinatorics" },
    { id: "math.NT", name: "Number Theory" },
    { id: "math.LO", name: "Logic" },
    { id: "math.AT", name: "Algebraic Topology" },
    { id: "math.CT", name: "Category Theory" },
    { id: "math.IT", name: "Information Theory" },
    { id: "math.MP", name: "Mathematical Physics" },
    { id: "math.QA", name: "Quantum Algebra" },
  ]},
  { section: "Physics", categories: [
    { id: "physics.comp-ph", name: "Computational Physics" },
    { id: "physics.app-ph", name: "Applied Physics" },
    { id: "physics.data-an", name: "Data Analysis, Statistics and Probability" },
    { id: "physics.class-ph", name: "Classical Physics" },
    { id: "physics.gen-ph", name: "General Physics" },
    { id: "physics.optics", name: "Optics" },
    { id: "physics.flu-dyn", name: "Fluid Dynamics" },
    { id: "physics.acc-ph", name: "Accelerator Physics" },
    { id: "physics.ao-ph", name: "Atmospheric and Oceanic Physics" },
    { id: "physics.atm-clus", name: "Atomic and Molecular Clusters" },
    { id: "physics.atom-ph", name: "Atomic Physics" },
    { id: "physics.bio-ph", name: "Biological Physics" },
    { id: "physics.chem-ph", name: "Chemical Physics" },
    { id: "physics.geo-ph", name: "Geophysics" },
    { id: "physics.ins-det", name: "Instrumentation and Detectors" },
    { id: "physics.med-ph", name: "Medical Physics" },
    { id: "physics.plasm-ph", name: "Plasma Physics" },
    { id: "physics.soc-ph", name: "Physics and Society" },
    { id: "physics.space-ph", name: "Space Physics" },
  ]},
  { section: "Statistics", categories: [
    { id: "stat.ML", name: "Machine Learning" },
    { id: "stat.AP", name: "Applications" },
    { id: "stat.CO", name: "Computation" },
    { id: "stat.ME", name: "Methodology" },
    { id: "stat.TH", name: "Statistics Theory" },
  ]},
  { section: "Quantitative Biology", categories: [
    { id: "q-bio.BM", name: "Biomolecules" },
    { id: "q-bio.CB", name: "Cell Behavior" },
    { id: "q-bio.GN", name: "Genomics" },
    { id: "q-bio.MN", name: "Molecular Networks" },
    { id: "q-bio.NC", name: "Neurons and Cognition" },
    { id: "q-bio.PE", name: "Populations and Evolution" },
    { id: "q-bio.QM", name: "Quantitative Methods" },
    { id: "q-bio.SC", name: "Subcellular Processes" },
    { id: "q-bio.TO", name: "Tissues and Organs" },
  ]},
];

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
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    fetchSchedules();
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

  const handleCreate = async () => {
    if (!formName.trim() || formCategories.length === 0) {
      setMessage("Name and at least one category are required");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          categories: formCategories,
          papersPerCategory: formPapersPerCategory,
          intervalDays: formIntervalDays,
        }),
      });

      if (res.ok) {
        setMessage("Schedule created successfully");
        setFormName("");
        setFormCategories([]);
        setFormPapersPerCategory(5);
        setFormIntervalDays(1);
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
  };

  const handleUpdate = async () => {
    if (!editingId || !formName.trim() || formCategories.length === 0) {
      setMessage("Name and at least one category are required");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/schedules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          categories: formCategories,
          papersPerCategory: formPapersPerCategory,
          intervalDays: formIntervalDays,
        }),
      });

      if (res.ok) {
        setMessage("Schedule updated successfully");
        setEditingId(null);
        setFormName("");
        setFormCategories([]);
        setFormPapersPerCategory(5);
        setFormIntervalDays(1);
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
    setFormName("");
    setFormCategories([]);
    setFormPapersPerCategory(5);
    setFormIntervalDays(1);
  };

  const toggleCategory = (categoryId: string) => {
    setFormCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = ARXIV_CATEGORIES.map(section => ({
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
    if (!confirm(`Are you sure you want to delete "${schedule.name}"?`)) return;

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

  const getIntervalLabel = (days: number) => {
    const option = INTERVAL_OPTIONS.find(o => o.value === days);
    return option ? option.label : `${days} days`;
  };

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
            {editingId ? "Edit Schedule" : "New Schedule"}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Daily AI Papers"
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
                Categories {formCategories.length > 0 && `(${formCategories.length} selected)`}
              </label>
              <input
                type="text"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filter categories (e.g., machine learning, cs.AI, robotics)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '12px',
                background: 'var(--bg-primary)',
                border: '0.5px solid var(--border-primary)',
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Papers per Category
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formPapersPerCategory}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.length > 1 && value.startsWith('0')) {
                    value = value.replace(/^0+/, '');
                  }
                  setFormPapersPerCategory(Number(value) || 0);
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
                Interval
              </label>
              <select
                value={formIntervalDays}
                onChange={(e) => setFormIntervalDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '0.5px solid var(--border-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              >
                {INTERVAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {editingId ? (
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
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Interval</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Next Run</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Runs</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule._id!.toString()} style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{schedule.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)', fontSize: '12px' }}>
                        {schedule.categories.join(", ")}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{getIntervalLabel(schedule.intervalDays)}</td>
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
                        {formatDate(schedule.nextRunAt)}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)' }}>
                        {schedule.runCount}
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
                            onClick={() => handleDelete(schedule)}
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
    </div>
  );
}
