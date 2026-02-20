import Image from "next/image";
import { SignUpButton, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import HomepageDemo from "./components/HomepageDemo";

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

        <HomepageDemo />
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
