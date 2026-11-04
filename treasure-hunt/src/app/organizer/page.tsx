import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import CreateEventPanel from './CreateEventForm'
import EventRowActions from './EventRowActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  DRAFT:     { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
  READY:     { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  LIVE:      { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e' },
  PAUSED:    { bg: '#fef9c3', fg: '#a16207', dot: '#eab308' },
  COMPLETED: { bg: '#ede9fe', fg: '#6d28d9', dot: '#8b5cf6' },
}

async function getEvents() {
  const { prisma } = await import('@/lib/db')
  return prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { teams: true, clues: true, qrCodes: true } } },
  })
}

export default async function OrganizerPage() {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const events = await getEvents()

  return (
    <div>
      {/* Choice Awards Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #181124 0%, #291b3f 55%, #150921 100%)',
          border: '1.5px solid rgba(255,200,87,0.35)',
          borderRadius: 20,
          padding: '22px 26px',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          marginBottom: 32,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -20, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.18), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,200,87,0.15)', border: '1px solid rgba(255,200,87,0.35)', color: '#FFC857', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            <span>🏆 FEATURED EVENT</span>
          </div>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 85%, #FF6B35 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Choice Awards 2026
          </div>
          <div style={{ color: '#d8c7ed', fontSize: 13, lineHeight: 1.45 }}>
            Unified anonymous audience voting form for all award categories, complete with live response toggles and the Oscars Ceremony big-screen reveal stage!
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <Link
            href="/vote"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📱 Voting Form ↗
          </Link>
          <Link
            href="/choice-awards/live"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,200,87,0.15)',
              border: '1px solid rgba(255,200,87,0.4)',
              color: '#FFC857',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            🏆 Oscars Projector ↗
          </Link>
          <Link
            href="/organizer/choice-awards"
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
              color: '#150324',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(255,200,87,0.35)',
            }}
          >
            Manage Setup →
          </Link>
        </div>
      </div>

      {/* 3D Mascot Challenge Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0e122b 0%, #1a1e4a 55%, #0d1028 100%)',
          border: '1.5px solid rgba(129,140,248,0.35)',
          borderRadius: 20,
          padding: '22px 26px',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          marginBottom: 32,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -20, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(129,140,248,0.4)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            <span>🎨 ARTVERSE 2026</span>
          </div>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(135deg, #ffffff 40%, #c7d2fe 85%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Artverse: 3D Mascot Challenge
          </div>
          <div style={{ color: '#c7d2fe', fontSize: 13, lineHeight: 1.45 }}>
            Management's Artverse creative contest: Employees submit custom-designed 3D mascot models (.STL / .OBJ / .GLB) with the story and symbolism behind their creation.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <Link
            href="/artverse"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📱 Public Form ↗
          </Link>
          <Link
            href="/organizer/mascots"
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
          >
            View Artverse Entries →
          </Link>
        </div>
      </div>

      {/* Diwali Bay & Desk Decoration Event Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #091a2b 0%, #0d2847 55%, #081726 100%)',
          border: '1.5px solid rgba(56,189,248,0.35)',
          borderRadius: 20,
          padding: '22px 26px',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          marginBottom: 32,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -20, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.2), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', color: '#7dd3fc', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            <span>✨ DECORATION CONTEST 2026</span>
          </div>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(135deg, #ffffff 40%, #bae6fd 85%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Diwali Desk & Bay Decoration Event
          </div>
          <div style={{ color: '#bae6fd', fontSize: 13, lineHeight: 1.45 }}>
            Setup team decoration counters and scoring factors. Audience visits each counter, grades on N factors, and casts 1 vote for all teams with real-time pause/resume/stop controls.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <Link
            href="/decoration/live"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📺 Live Screen ↗
          </Link>
          <Link
            href="/decoration"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📱 Audience Ballot ↗
          </Link>
          <Link
            href="/organizer/decoration"
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(56,189,248,0.35)',
            }}
          >
            Manage Decoration →
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>Events</div>
          <div style={{ color: '#64748b', marginTop: 4 }}>{events.length} events in your workspace</div>
        </div>
        <CreateEventPanel />
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎪</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No events yet</div>
          <div style={{ fontSize: 13 }}>Create your first event to get started</div>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px 90px 90px 110px 72px',
            gap: 16, padding: '8px 8px', fontSize: 11, fontWeight: 600,
            letterSpacing: '.06em', color: '#64748b', background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <div>NAME</div><div>STATUS</div><div>TEAMS</div><div>STAGES</div><div>CLUES / QR</div><div />
          </div>
          {events.map(ev => {
            const st = STATUS_STYLE[ev.status] ?? STATUS_STYLE.DRAFT
            return (
              <div key={ev.id} className="row-link" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 110px 90px 90px 110px 72px',
                gap: 16, alignItems: 'center', padding: '16px 8px',
                borderBottom: '1px solid #e5e7eb',
              }}>
                <Link href={`/organizer/events/${ev.id}`} style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{ev.name}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: ev.gameType === 'QUIZ' ? '#e0f2fe' : ev.gameType === 'FUNTAKSHARI' ? '#fdf2f8' : '#fff7ed',
                        color: ev.gameType === 'QUIZ' ? '#0369a1' : ev.gameType === 'FUNTAKSHARI' ? '#be185d' : '#c2410c',
                        border: `1px solid ${ev.gameType === 'QUIZ' ? '#bae6fd' : ev.gameType === 'FUNTAKSHARI' ? '#fbcfe8' : '#fed7aa'}`,
                      }}>
                        {ev.gameType === 'QUIZ' ? '🧠 Quiz' : ev.gameType === 'FUNTAKSHARI' ? '🎵 Funtakshari' : '🏆 Treasure Hunt'}
                      </span>
                    </div>
                    {ev.description && <div style={{ color: '#64748b', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.description}</div>}
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.fg }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                      {ev.status}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{ev._count.teams}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>Teams</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.gameType === 'TREASURE_HUNT' ? ev.stagesPerTeam : `${ev.membersPerTeam || 4}/team`}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{ev.gameType === 'TREASURE_HUNT' ? 'Stages' : 'Members'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {ev.gameType === 'TREASURE_HUNT' ? `${ev._count.clues} / ${ev._count.qrCodes}` : 'Scoreboard'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>
                      {ev.gameType === 'TREASURE_HUNT' ? 'Clues / QR' : 'Live Score'}
                    </div>
                  </div>
                </Link>
                <EventRowActions
                  eventId={ev.id}
                  name={ev.name}
                  description={ev.description}
                  status={ev.status}
                  gameType={ev.gameType}
                  teamCount={ev.teamCount}
                  stagesPerTeam={ev.stagesPerTeam}
                  membersPerTeam={ev.membersPerTeam}
                  hasCommonFinalQr={ev.hasCommonFinalQr}
                  maxHintsPerTeam={ev.maxHintsPerTeam}
                  hintDelayMinutes={ev.hintDelayMinutes}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
