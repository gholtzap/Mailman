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
          <a
            href="https://github.com/gholtzap/Mailman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="github-icon-link"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
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
