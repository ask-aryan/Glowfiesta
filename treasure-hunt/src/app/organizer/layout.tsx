'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const IC = {
  dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  teams: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  clues: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1',
  prog: 'M3 3v18h18M7 14l4-4 4 4 5-6',
  selfie: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  score: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  board: 'M2 3h20v14H2zm6 18h8m-4-4v4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [eventMeta, setEventMeta] = useState<{ id: number; name: string; gameType: string } | null>(null)

  const eventMatch = pathname.match(/\/organizer\/events\/(\d+)/)
  const eventId = eventMatch?.[1]

  useEffect(() => {
    if (!eventId) {
      setEventMeta(null)
      return
    }
    fetch(`/api/organizer/events/${eventId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.event) {
          setEventMeta({
            id: data.event.id,
            name: data.event.name,
            gameType: data.event.gameType || 'TREASURE_HUNT',
          })
        }
      })
      .catch(() => {})
  }, [eventId])

  const isScoreGame = eventMeta?.gameType === 'QUIZ' || eventMeta?.gameType === 'FUNTAKSHARI'

  const isActive = (key: string) => {
    if (key === 'dashboard') return pathname === '/organizer'
    if (!eventId) return false
    if (key === 'teams') return pathname.includes('/teams')
    if (key === 'scores') return pathname.includes('/scores')
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

  const gameLabel = isScoreGame
    ? (eventMeta?.gameType === 'QUIZ' ? 'Quiz' : 'Funtakshari')
    : 'Treasure Hunt'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, color: '#0f172a' }}>
      {/* Top Compact Glassmorphism Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 56,
          background: 'rgba(11, 18, 32, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: 16,
          flexShrink: 0,
        }}
      >
        {/* Left: Brand / Event Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 0 }}>
          {eventId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href="/organizer"
                title="Back to All Events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>←</span>
                <span>Events</span>
              </Link>

              <Link
                href={`/organizer/events/${eventId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: isScoreGame
                    ? (eventMeta?.gameType === 'QUIZ' ? '#0284c7' : '#db2777')
                    : 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 10,
                  flexShrink: 0,
                }}>
                  {isScoreGame ? (eventMeta?.gameType === 'QUIZ' ? 'QZ' : 'FK') : 'TH'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {eventMeta?.name || 'Loading…'}
                  </div>
                  <div style={{ fontSize: 10, color: isScoreGame ? '#38bdf8' : '#FF6B35', fontWeight: 600, marginTop: 1 }}>
                    {gameLabel}
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <Link
              href="/organizer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-.02em',
              }}
            >
              <span style={{ fontSize: 20 }}>🪔</span>
              <span style={{ background: 'linear-gradient(135deg,#fff,#ffd9b8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                GlowFiesta
              </span>
              <span style={{ fontSize: 11, background: '#FF6B35', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                ORG
              </span>
            </Link>
          )}
        </div>

        {/* Center: Navigation Tabs with Heavy Weightage for Live Progress / Scorekeeper */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none' }}>
          {eventId ? (
            <>
              {/* TREASURE HUNT: Heavy weightage to Live Progress */}
              {!isScoreGame && (
                <Link
                  href={`/organizer/events/${eventId}/progress`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '.02em',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: isActive('progress')
                      ? 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)'
                      : 'rgba(255, 107, 53, 0.18)',
                    color: '#fff',
                    border: isActive('progress')
                      ? '1px solid #FFC857'
                      : '1px solid rgba(255, 107, 53, 0.45)',
                    boxShadow: isActive('progress')
                      ? '0 2px 14px rgba(255, 107, 53, 0.5)'
                      : '0 1px 6px rgba(255, 107, 53, 0.25)',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                    }}
                  />
                  <span>⚡ LIVE PROGRESS</span>
                </Link>
              )}

              {/* SCORE GAMES: Heavy weightage to Scorekeeper */}
              {isScoreGame && (
                <Link
                  href={`/organizer/events/${eventId}/scores`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '.02em',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: isActive('scores')
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'rgba(245, 158, 11, 0.2)',
                    color: '#fff',
                    border: isActive('scores')
                      ? '1px solid #fef08a'
                      : '1px solid rgba(245, 158, 11, 0.45)',
                    boxShadow: isActive('scores')
                      ? '0 2px 14px rgba(245, 158, 11, 0.5)'
                      : '0 1px 6px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <span>⭐</span>
                  <span>SCOREKEEPER</span>
                </Link>
              )}

              {/* Teams Tab */}
              <Link
                href={`/organizer/events/${eventId}/teams`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 8,
                  fontWeight: isActive('teams') ? 600 : 500,
                  fontSize: 12.5,
                  textDecoration: 'none',
                  color: isActive('teams') ? '#fff' : '#cbd5e1',
                  background: isActive('teams') ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: isActive('teams') ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={IC.teams} />
                </svg>
                <span>Teams</span>
              </Link>

              {/* Treasure Hunt specific secondary tabs */}
              {!isScoreGame && (
                <>
                  <Link
                    href={`/organizer/events/${eventId}/clues`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 8,
                      fontWeight: isActive('clues') ? 600 : 500,
                      fontSize: 12.5,
                      textDecoration: 'none',
                      color: isActive('clues') ? '#fff' : '#cbd5e1',
                      background: isActive('clues') ? 'rgba(255,255,255,0.12)' : 'transparent',
                      border: isActive('clues') ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={IC.clues} />
                    </svg>
                    <span>Clues</span>
                  </Link>

                  <Link
                    href={`/organizer/events/${eventId}/qr`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 8,
                      fontWeight: isActive('qr') ? 600 : 500,
                      fontSize: 12.5,
                      textDecoration: 'none',
                      color: isActive('qr') ? '#fff' : '#cbd5e1',
                      background: isActive('qr') ? 'rgba(255,255,255,0.12)' : 'transparent',
                      border: isActive('qr') ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={IC.qr} />
                    </svg>
                    <span>QR Codes</span>
                  </Link>

                  <Link
                    href={`/organizer/events/${eventId}/selfies`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 8,
                      fontWeight: isActive('selfies') ? 600 : 500,
                      fontSize: 12.5,
                      textDecoration: 'none',
                      color: isActive('selfies') ? '#fff' : '#cbd5e1',
                      background: isActive('selfies') ? 'rgba(255,255,255,0.12)' : 'transparent',
                      border: isActive('selfies') ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={IC.selfie} />
                    </svg>
                    <span>Selfies</span>
                  </Link>
                </>
              )}

              {/* Score Games secondary tab: Live Scoreboard Projector */}
              {isScoreGame && (
                <Link
                  href={`/scoreboard/${eventId}`}
                  target="_blank"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 11px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 12.5,
                    textDecoration: 'none',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={IC.board} />
                  </svg>
                  <span>Projector ↗</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/organizer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
                color: '#fff',
                background: 'rgba(255,255,255,0.12)',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={IC.dash} />
              </svg>
              <span>All Events</span>
            </Link>
          )}
        </nav>

        {/* Right: Admin info and Logout button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 8px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              A
            </div>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>Admin</span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ef4444'
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#94a3b8'
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d={IC.logout} />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area: Maximum Horizontal Space */}
      <main style={{ flex: 1, minWidth: 0, padding: '24px 32px 60px', boxSizing: 'border-box', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
