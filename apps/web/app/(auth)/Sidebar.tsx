"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {!mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 50,
            padding: '8px',
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '4px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px'
          }}
          className="flex md:hidden"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--text-primary)' }}>
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40
          }}
          className="md:hidden"
        />
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden md:flex"
          style={{
            position: 'fixed',
            top: '16px',
            left: '8px',
            zIndex: 50,
            width: '28px',
            height: '28px',
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: '4px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
          aria-label="Expand sidebar"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <aside
        className={`fixed md:sticky top-0 h-screen z-50 md:z-auto md:left-0 ${mobileMenuOpen ? 'left-0' : '-left-[200px]'}`}
        style={{
          width: collapsed ? '0px' : '200px',
          background: 'var(--bg-secondary)',
          borderRight: '0.5px solid var(--border-primary)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          transition: 'left 200ms cubic-bezier(0.25, 1, 0.5, 1), width 200ms cubic-bezier(0.25, 1, 0.5, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '0 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image
              src="/mailman-logo.png"
              alt="Mailman"
              width={24}
              height={24}
              priority
            />
            <h1 style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)'
            }}>Mailman</h1>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Collapse sidebar"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
          <NavLink href="/dashboard" active={pathname === '/dashboard'} onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>
          <NavLink href="/papers" active={pathname === '/papers'} onClick={() => setMobileMenuOpen(false)}>Papers</NavLink>
          <NavLink href="/schedules" active={pathname === '/schedules'} onClick={() => setMobileMenuOpen(false)}>Schedules</NavLink>
          <div style={{ marginTop: 'auto' }}>
            <NavLink href="/settings" active={pathname === '/settings'} onClick={() => setMobileMenuOpen(false)}>Settings</NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}

function NavLink({ href, children, active, onClick }: { href: string; children: React.ReactNode; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{
      padding: '6px 8px',
      borderRadius: '4px',
      fontSize: '13px',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: active ? 'var(--bg-tertiary)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 150ms cubic-bezier(0.25, 1, 0.5, 1)',
      display: 'block'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }
    }}>
      {children}
    </Link>
  );
}
