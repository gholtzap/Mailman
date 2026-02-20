"use client";

import { useState } from "react";
import { ARXIV_CATEGORIES, POPULAR_CATEGORY_IDS } from "@/lib/arxiv-categories";

const POPULAR_CATEGORIES = ARXIV_CATEGORIES.flatMap((section) =>
  section.categories.filter((cat) => POPULAR_CATEGORY_IDS.has(cat.id))
);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_DAYS = [1, 3, 5];

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

const TAB_CONTENT: Record<string, string[]> = {
  humanized: [
    "This paper tackles a real bottleneck in deploying large language models: inference is slow and expensive when every token has to pass through every parameter.",
    "The authors propose a sparse MoE layer that routes each token to only 2 of 8 expert sub-networks, cutting compute by roughly 4x. The routing mechanism is learned end-to-end with no auxiliary balancing loss -- instead they use a soft capacity constraint that naturally distributes load across experts.",
    "Results on MMLU, HellaSwag, and ARC-Challenge are within 0.3% of the dense baseline, while wall-clock inference time drops from 42ms to 11ms per token on A100 hardware.",
  ],
  technical: [
    "The proposed architecture replaces dense FFN layers with a top-2 gated mixture of 8 expert networks, each with dimensionality d_model/4. Token-to-expert assignment is computed via a softmax-normalized linear gate W_g, with a differentiable load-balancing term added to the routing logits.",
    "Unlike Switch Transformer and GShard, this approach eliminates auxiliary balancing losses entirely. Instead, a soft capacity factor C=1.25 clips expert buffers, and overflow tokens are routed to a shared residual expert, ensuring no token is dropped during training or inference.",
    "Benchmarked against a parameter-matched dense baseline (6.7B params, 1.8B active), the model achieves 73.2% on MMLU (vs 73.5% dense), 82.1% on HellaSwag (vs 82.3%), and 61.4% on ARC-C (vs 61.2%), with 3.8x lower FLOPs per forward pass.",
  ],
  abstract: [
    "We present an efficient sparse mixture-of-experts (MoE) architecture designed for low-latency inference in large language models. Our method employs a learned top-k routing mechanism that assigns each input token to a subset of specialized expert sub-networks, significantly reducing computational cost while preserving model capacity.",
    "We introduce a novel soft capacity constraint that replaces traditional auxiliary load-balancing losses, enabling stable training without hyperparameter-sensitive balancing terms. A shared residual expert processes overflow tokens, guaranteeing complete token coverage.",
    "Extensive evaluation on standard NLP benchmarks demonstrates that our approach achieves performance within 0.3% of dense baselines while reducing per-token FLOPs by approximately 4x, yielding a corresponding improvement in wall-clock inference latency on modern accelerator hardware.",
  ],
};

const TABS = ["Humanized", "Technical", "Abstract"] as const;

export default function HomepageDemo() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "cs.AI",
    "cs.LG",
    "cs.CL",
  ]);
  const [selectedDays, setSelectedDays] = useState<number[]>(DEFAULT_DAYS);
  const [selectedHour, setSelectedHour] = useState(9);
  const [activeTab, setActiveTab] = useState<string>("humanized");

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleDay(index: number) {
    setSelectedDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
    );
  }

  return (
    <div style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto", marginBottom: "128px" }}>
      <div className="flex flex-col gap-10">

        <div className="flex gap-4">
          <div className="step-number">1</div>
          <div className="flex-1">
            <h3
              className="text-base font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Pick your categories
            </h3>
            <div className="mock-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POPULAR_CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "6px",
                        border: `0.5px solid ${isSelected ? "var(--accent)" : "var(--border-primary)"}`,
                        background: isSelected ? "var(--accent-muted)" : "var(--bg-tertiary)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: isSelected ? "var(--accent)" : "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {category.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {category.id}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                {selectedCategories.length} selected
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="step-number">2</div>
          <div className="flex-1">
            <h3
              className="text-base font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Set your schedule
            </h3>
            <div className="mock-card">
              <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                {DAY_LABELS.map((label, index) => {
                  const isActive = selectedDays.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                        color: isActive ? "white" : "var(--text-muted)",
                        border: `0.5px solid ${isActive ? "var(--accent)" : "var(--border-primary)"}`,
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "0.5px solid var(--border-primary)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "border-color 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-primary)")}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="step-number">3</div>
          <div className="flex-1">
            <h3
              className="text-base font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Read your summaries
            </h3>
            <div className="mock-card" style={{ padding: "20px" }}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    background: "var(--success-muted)",
                    color: "var(--success)",
                    borderRadius: "4px",
                    fontWeight: 500,
                  }}
                >
                  completed
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                  2501.09781
                </span>
              </div>
              <div
                className="font-semibold mb-4"
                style={{ color: "var(--text-primary)", fontSize: "14px", letterSpacing: "-0.01em" }}
              >
                Efficient Sparse Mixture-of-Experts for Low-Latency Inference
              </div>

              <div
                className="flex gap-0 mb-4"
                style={{ borderBottom: "0.5px solid var(--border-primary)" }}
              >
                {TABS.map((tab) => {
                  const key = tab.toLowerCase();
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(key)}
                      style={{
                        padding: "8px 12px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        background: "none",
                        border: "none",
                        borderBottom: isActive
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 150ms cubic-bezier(0.25, 1, 0.5, 1)",
                        marginBottom: "-0.5px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.7" }}>
                {TAB_CONTENT[activeTab].map((paragraph, i) => (
                  <p
                    key={`${activeTab}-${i}`}
                    style={{
                      margin: i < TAB_CONTENT[activeTab].length - 1 ? "0 0 10px 0" : "0",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
