import Link from "next/link";
import Image from "next/image";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

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
        <div className="text-center mb-16 md:mb-32">
          <h1
            className="text-3xl md:text-5xl font-semibold mb-6"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: '1.1'
            }}
          >
            Mailman delivers research papers to your doorstep.
          </h1>
          <p
            className="text-base mb-8 mx-auto"
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              lineHeight: '1.6'
            }}
          >
            Set up routine deliveries for arXiv papers, summarized and 'humanized' with claude, to get concise, readable summaries.
          </p>
          <SignUpButton mode="modal">
            <button className="hero-cta-btn">
              Set up Mailman
            </button>
          </SignUpButton>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-24">
          <div
            className="p-4 rounded"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px'
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Your interests
            </h3>
            <p
              className="text-sm"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}
            >
              Choose what you'd like to read from 100+ categories- AI, Cryptography, Genomics, etc.
            </p>
          </div>

          <div
            className="p-4 rounded"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px'
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Your Schedule
            </h3>
            <p
              className="text-sm"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}
            >
              Technical summaries are delivered by email at a cadence of your choosing.
            </p>
          </div>

          <div
            className="p-4 rounded"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              borderRadius: '6px'
            }}
          >
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              BYOK
            </h3>
            <p
              className="text-sm"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}
            >
              Use your own Anthropic API key.
            </p>
          </div>
        </div>

        
      </main>

    </div>
  );
}
