import Link from 'next/link';

export function Footer() {
  return (
    <div style={{ background: '#2B2926', color: '#F4EFE1' }}>
      <div
        className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-wrap justify-between gap-10 pt-12 text-[13px]"
        style={{ fontFamily: 'var(--font-space-mono), monospace', letterSpacing: '0.3px' }}
      >
        <div className="flex flex-col gap-3">
          <span style={{ color: '#8A8475' }}>(menu)</span>
          <Link href="/" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
            home
          </Link>
          <Link href="/library" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
            library
          </Link>
          <Link href="/authors" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
            favorite authors
          </Link>
        </div>
      </div>

      <div className="overflow-hidden pt-10 pb-6">
        <div
          className="text-center whitespace-nowrap"
          style={{ fontFamily: 'var(--font-marker)', fontSize: 'clamp(70px, 18vw, 220px)', lineHeight: 0.82, color: '#F4EFE1', letterSpacing: '-0.01em' }}
        >
          The Stack
        </div>
        <div
          className="max-w-[1280px] mx-auto px-6 md:px-12 flex justify-between flex-wrap gap-2 text-[11.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#6f685c' }}
        >
          <span>© 2026 THE STACK</span>
          <span>GOOGLE BOOKS &amp; OPEN LIBRARY</span>
        </div>
      </div>
    </div>
  );
}
