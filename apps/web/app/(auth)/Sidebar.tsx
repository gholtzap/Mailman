"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '200px',
      background: 'var(--bg-secondary)',
      borderRight: '0.5px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0'
    }}>
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)'
        }}>Mailman</h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
        <NavLink href="/dashboard" active={pathname === '/dashboard'}>Dashboard</NavLink>
        <NavLink href="/papers" active={pathname === '/papers'}>Papers</NavLink>
        <NavLink href="/papers/new" active={pathname === '/papers/new'}>New Paper</NavLink>
        <NavLink href="/batch" active={pathname === '/batch'}>Batch Process</NavLink>
        <div style={{ marginTop: 'auto' }}>
          <NavLink href="/settings" active={pathname === '/settings'}>Settings</NavLink>
        </div>
      </nav>
    </aside>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} style={{
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
