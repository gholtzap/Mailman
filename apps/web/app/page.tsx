import Image from "next/image";
import { SignUpButton, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

const MOCK_CATEGORIES = ["cs.AI", "cs.LG", "cs.CL", "stat.ML", "cs.CR"];

const MOCK_SUMMARY_LINES = [
  "This paper introduces a sparse mixture-of-experts architecture that reduces inference cost by 4x while maintaining benchmark performance across standard NLP tasks.",
  "The key insight is routing tokens to specialized sub-networks at each layer, with a learned gating mechanism that balances load without auxiliary losses.",
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <nav
        className="mx-auto px-4 md:px-8 py-4 flex justify-between items-center"
        style={{
          borderBottom: '0.5px solid var(--border-primary)',
          maxWidth: '1200px'
        }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/mailman-logo.png"
            alt="Mailman"
            width={32}
            height={32}
            priority
          />
          <div
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Mailman
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="nav-secondary-btn">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="nav-primary-btn">
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="nav-secondary-btn">
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </nav>

      <main className="mx-auto px-4 md:px-8 py-12 md:py-24" style={{ maxWidth: '1200px' }}>
        <div className="text-center mb-16 md:mb-24">
          <h1
            className="text-2xl md:text-3xl font-semibold mb-6"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: '1.1'
            }}
          >
            arXiv papers, summarized and sent to your inbox.
          </h1>
          <SignUpButton mode="modal">
            <button className="hero-cta-btn">
              Get started
            </button>
          </SignUpButton>
        </div>

        <div style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '128px' }}>
          <div className="flex flex-col gap-10">

            <div className="flex gap-4">
              <div className="step-number">1</div>
              <div className="flex-1">
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Pick your categories
                </h3>
                <div className="mock-card">
                  <div className="flex flex-wrap gap-2">
                    {MOCK_CATEGORIES.map((cat) => (
                      <span key={cat} className="category-tag">{cat}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="step-number">2</div>
              <div className="flex-1">
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Set your schedule
                </h3>
                <div className="mock-card">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {["Mon", "Wed", "Fri"].map((day) => (
                      <span key={day} className="day-pill day-pill-active">{day}</span>
                    ))}
                    {["Tue", "Thu", "Sat", "Sun"].map((day) => (
                      <span key={day} className="day-pill">{day}</span>
                    ))}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Delivers at 9:00 AM EST
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="step-number">3</div>
              <div className="flex-1">
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Read your summaries
                </h3>
                <div className="mock-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        background: 'var(--accent-muted)',
                        color: 'var(--accent-hover)',
                        borderRadius: '3px',
                        fontWeight: 500,
                      }}
                    >
                      2501.09781
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      cs.LG
                    </span>
                  </div>
                  <div
                    className="mb-3 font-semibold"
                    style={{ color: 'var(--text-primary)', fontSize: '14px' }}
                  >
                    Efficient Sparse Mixture-of-Experts for Low-Latency Inference
                  </div>
                  {MOCK_SUMMARY_LINES.map((line, i) => (
                    <p
                      key={i}
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        margin: '0 0 8px 0',
                      }}
                    >
                      {line}
                    </p>
                  ))}
                  <div style={{ marginTop: '12px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--accent)',
                        fontWeight: 500,
                      }}
                    >
                      View Full Summary
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="mb-16 md:mb-24" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div
            className="mock-card"
            style={{ padding: '20px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  background: 'var(--success-muted)',
                  color: 'var(--success)',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                completed
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                2501.09781
              </span>
            </div>
            <div
              className="font-semibold mb-4"
              style={{ color: 'var(--text-primary)', fontSize: '16px', letterSpacing: '-0.01em' }}
            >
              Efficient Sparse Mixture-of-Experts for Low-Latency Inference
            </div>

            <div
              className="flex gap-0 mb-4"
              style={{ borderBottom: '0.5px solid var(--border-primary)' }}
            >
              {["Humanized", "Technical", "Abstract"].map((tab, i) => (
                <button
                  key={tab}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'default',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                This paper tackles a real bottleneck in deploying large language models: inference is slow and expensive when every token has to pass through every parameter.
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                The authors propose a sparse MoE layer that routes each token to only 2 of 8 expert sub-networks, cutting compute by roughly 4x. The routing mechanism is learned end-to-end with no auxiliary balancing loss -- instead they use a soft capacity constraint that naturally distributes load across experts.
              </p>
              <p style={{ margin: '0' }}>
                Results on MMLU, HellaSwag, and ARC-Challenge are within 0.3% of the dense baseline, while wall-clock inference time drops from 42ms to 11ms per token on A100 hardware.
              </p>
            </div>
          </div>
        </div>

      </main>

      <footer
        className="mx-auto px-4 md:px-8 py-8"
        style={{
          maxWidth: '1200px',
          borderTop: '0.5px solid var(--border-primary)',
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/mailman-logo.png"
              alt="Mailman"
              width={20}
              height={20}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Built for researchers who read too many abstracts.
            </span>
          </div>
          <SignedOut>
            <SignUpButton mode="modal">
              <button
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '0.5px solid var(--border-primary)',
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </footer>
    </div>
  );
}
