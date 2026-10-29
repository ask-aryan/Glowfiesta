'use client'
import { usePathname, useRouter } from 'next/navigation'

const IC = {
  dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  teams: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  clues: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1',
  prog: 'M3 3v18h18M7 14l4-4 4 4 5-6',
  selfie: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}

function NavItem({ icon, label, href, active, count }: { icon: string; label: string; href: string; active: boolean; count?: number | string }) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(href)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        borderRadius: 8, cursor: 'pointer', fontWeight: 500, position: 'relative',
        background: active ? 'rgba(255,107,53,.14)' : 'transparent',
        color: active ? '#fff' : '#cbd5e1',
        transition: 'background .15s, color .15s',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#1a2540'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; } }}
    >
      {active && <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', background: '#FF6B35' }} />}
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && count !== '' && <span style={{ fontSize: 11, color: '#64748b' }}>{count}</span>}
    </div>
  )
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const eventMatch = pathname.match(/\/organizer\/events\/(\d+)/)
  const eventId = eventMatch?.[1]

  const isActive = (key: string) => {
    if (key === 'dashboard') return pathname === '/organizer'
    if (!eventId) return false
    if (key === 'teams') return pathname.includes('/teams')
    if (key === 'clues') return pathname.includes('/clues')
    if (key === 'qr') return pathname.includes('/qr')
    if (key === 'progress') return pathname.includes('/progress')
    if (key === 'selfies') return pathname.includes('/selfies')
    if (key === 'event') return pathname === `/organizer/events/${eventId}`
    return false
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, color: '#0f172a' }}>
      <aside style={{
        width: 232, flexShrink: 0, background: '#0b1220', color: '#cbd5e1',
        display: 'flex', flexDirection: 'column', padding: '16px 12px',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div
          onClick={() => router.push(eventId ? `/organizer/events/${eventId}` : '/organizer')}
          style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10, cursor: 'pointer', background: '#131c30', marginBottom: 4 }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FF6B35', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>TH</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>GlowFiesta 2026</div>
            <div style={{ fontSize: 11, color: '#FF6B35', marginTop: 2 }}>Treasure Hunt</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: '#64748b', margin: '22px 10px 8px' }}>WORKSPACE</div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem icon={IC.dash} label="Dashboard" href="/organizer" active={isActive('dashboard')} />
          {eventId && <>
            <NavItem icon={IC.teams} label="Teams" href={`/organizer/events/${eventId}/teams`} active={isActive('teams')} />
            <NavItem icon={IC.clues} label="Clues" href={`/organizer/events/${eventId}/clues`} active={isActive('clues')} />
            <NavItem icon={IC.qr} label="QR Codes" href={`/organizer/events/${eventId}/qr`} active={isActive('qr')} />
            <NavItem icon={IC.prog} label="Live Progress" href={`/organizer/events/${eventId}/progress`} active={isActive('progress')} />
            <NavItem icon={IC.selfie} label="Team Selfies" href={`/organizer/events/${eventId}/selfies`} active={isActive('selfies')} />
          </>}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid #1e293b' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e293b', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>A</div>
          <div style={{ flex: 1, lineHeight: 1.25 }}>
            <div style={{ color: '#fff', fontWeight: 600 }}>Admin</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Organizer</div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{ background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fb923c'; (e.currentTarget as HTMLElement).style.background = '#1e293b'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={IC.logout} />
            </svg>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '28px 40px 60px', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  )
}
