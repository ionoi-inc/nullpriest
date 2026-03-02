'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'home' },
    { href: '/agents', label: 'agents' },
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      height: 52,
      background: 'rgba(8,8,8,0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <Link href="/" style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text)',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}>
          headless<span style={{ color: 'var(--accent)' }}>-</span>markets
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 12,
                color: pathname === link.href ? 'var(--accent)' : 'var(--muted)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                fontFamily: 'IBM Plex Mono, monospace',
                transition: 'color 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                if (pathname !== link.href) e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={e => {
                if (pathname !== link.href) e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Live indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11,
        color: 'var(--muted2)',
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent)',
          display: 'inline-block',
          animation: 'blink 2s ease-in-out infinite',
        }} />
        LIVE
      </div>
    </nav>
  );
}