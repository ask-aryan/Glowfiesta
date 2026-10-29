import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import EventStatusActions from './EventStatusActions'
import EditEventModal from './EditEventModal'

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string; anim?: string }> = {
  DRAFT:     { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
  READY:     { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  LIVE:      { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e', anim: 'pulse-dot 1.6s infinite' },
  PAUSED:    { bg: '#fef9c3', fg: '#a16207', dot: '#eab308' },
  COMPLETED: { bg: '#ede9fe', fg: '#6d28d9', dot: '#8b5cf6' },
}

const IC = {
  teams: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  clues: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1',
  prog: 'M3 3v18h18M7 14l4-4 4 4 5-6',
  selfie: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

async function getEvent(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { teams: true, clues: true, qrCodes: true } } },
  })
}

const ORDER = ['DRAFT', 'READY', 'LIVE', 'PAUSED', 'COMPLETED']

export default async function EventDetailPage({
  params,
}: {
  params: { eventId: string }
}) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const event = await getEvent(eventId)
  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  const st = STATUS_STYLE[event.status] ?? STATUS_STYLE.DRAFT
  const ci = ORDER.indexOf(event.status)

  const isScoreGame = event.gameType === 'QUIZ' || event.gameType === 'FUNTAKSHARI'

  const totalExpectedClues = event.stagesPerTeam * event.teamCount + (event.hasCommonFinalQr ? 1 : 0)
  const isTeamsReady = event._count.teams >= event.teamCount
  const isCluesReady = event._count.clues >= (totalExpectedClues > 0 ? totalExpectedClues : 1)
  const isQrReady = event._count.qrCodes > 0
  const isAllReadyForLaunch = isTeamsReady && isCluesReady && isQrReady

  const stats = isScoreGame
    ? [
        { label: 'Registered Teams', value: `${event._count.teams} / ${event.teamCount}`, sub: 'Teams ready' },
        { label: 'Members / Team', value: `${event.membersPerTeam || 4}`, sub: 'Players per roster' },
        { label: 'Game Type', value: event.gameType === 'QUIZ' ? 'Quiz' : 'Funtakshari', sub: 'Interactive buzzer' },
        { label: 'Scoreboard', value: 'Live Animated', sub: 'Projector ready' },
      ]
    : [
        { label: 'Teams', value: `${event._count.teams} / ${event.teamCount}`, sub: isTeamsReady ? '✓ Target reached' : `${event.teamCount - event._count.teams} remaining` },
        { label: 'Clues', value: `${event._count.clues} / ${totalExpectedClues}`, sub: isCluesReady ? '✓ All filled' : `${Math.max(0, totalExpectedClues - event._count.clues)} pending` },
        { label: 'QR Codes', value: `${event._count.qrCodes}`, sub: isQrReady ? '✓ Generated' : 'Pending creation' },
        { label: 'Stages / Team', value: `${event.stagesPerTeam}`, sub: `${event.hasCommonFinalQr ? '+1 final QR' : 'team-only'}` },
      ]

  const links = isScoreGame
    ? [
        { href: `/organizer/events/${eventId}/scores`, label: '⭐ Give Score (Scorekeeper)', sub: 'Fast 2x2 interactive scoring buttons with instant undo', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', isHero: true },
        { href: `/organizer/events/${eventId}/teams`, label: 'Manage Teams', sub: `${event._count.teams} teams (Leader & Members)`, icon: IC.teams, badge: `${event._count.teams} Teams` },
        { href: `/scoreboard/${eventId}`, label: 'Live Scoreboard ↗', sub: 'Projector screen with animated happy/sad reactions', icon: 'M2 3h20v14H2zm6 18h8m-4-4v4', badge: 'Audience View' },
      ]
    : [
        { href: `/organizer/events/${eventId}/progress`, label: '⚡ Live Progress', sub: 'Main command center: real-time stages & reception desk verification', icon: IC.prog, isHero: true, badge: 'Main Screen' },
        { href: `/organizer/events/${eventId}/teams`, label: 'Manage Teams', sub: `${event._count.teams} of ${event.teamCount} registered`, icon: IC.teams, badge: `${event._count.teams}/${event.teamCount}` },
        { href: `/organizer/events/${eventId}/clues`, label: 'Manage Clues', sub: `${event._count.clues} of ${totalExpectedClues} written`, icon: IC.clues, badge: `${event._count.clues}/${totalExpectedClues}` },
        { href: `/organizer/events/${eventId}/qr`, label: 'QR Codes', sub: `${event._count.qrCodes} printable cards generated`, icon: IC.qr, badge: `${event._count.qrCodes} Codes` },
        { href: `/organizer/events/${eventId}/selfies`, label: 'Team Selfies', sub: 'View photos & ZIP export', icon: IC.selfie, badge: 'Photos' },
      ]

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', marginBottom: 8, fontSize: 13 }}>
        <Link href="/organizer" style={{ color: '#64748b', textDecoration: 'none' }}>Events</Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{event.name}</span>
      </div>

      {/* Header with Title, Status, and Edit Event Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: '#0f172a' }}>{event.name}</div>
          {isScoreGame ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: event.gameType === 'QUIZ' ? '#e0f2fe' : '#fdf2f8',
              color: event.gameType === 'QUIZ' ? '#0369a1' : '#be185d',
              border: `1px solid ${event.gameType === 'QUIZ' ? '#bae6fd' : '#fbcfe8'}`,
            }}>
              {event.gameType === 'QUIZ' ? '🧠 Quiz Event' : '🎵 Funtakshari Event'}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: st.bg, color: st.fg }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, animation: st.anim, flexShrink: 0 }} />
              {event.status}
            </span>
          )}
        </div>

        {/* Edit Event Button (supports full editing in DRAFT status) */}
        <EditEventModal
          eventId={event.id}
          initialData={{
            name: event.name,
            description: event.description,
            status: event.status,
            gameType: event.gameType,
            teamCount: event.teamCount,
            stagesPerTeam: event.stagesPerTeam,
            membersPerTeam: event.membersPerTeam,
            hasCommonFinalQr: event.hasCommonFinalQr,
          }}
          triggerLabel="Edit Event Settings"
        />
      </div>

      {/* Top Stats Overview Grid: Full Width Utilization */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        {stats.map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#64748b', textTransform: 'uppercase' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: '#0f172a', marginTop: 4 }}>
              {s.value}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 2, fontWeight: 500 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* 2-COLUMN WIDESCREEN DASHBOARD GRID: Left: Setup & Lifecycle, Right: Tools & Workspace */}
      <div className="event-overview-grid">
        {/* LEFT COLUMN: Setup Wizard & Lifecycle Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* GUIDED SETUP FLOW WIZARD (Treasure Hunt & Score Games) */}
          {!isScoreGame ? (
            <div style={{
              background: '#fff',
              border: '1.5px solid #fed7aa',
              borderRadius: 16,
              padding: '22px 24px',
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#FF6B35', textTransform: 'uppercase' }}>
                    Setup & Preparation Wizard
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    Event Preparation Flow
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Follow these 4 steps to configure your hunt before going live.
                  </div>
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: event.status === 'LIVE' ? '#dcfce7' : event.status === 'READY' ? '#dbeafe' : '#fff7ed',
                  color: event.status === 'LIVE' ? '#15803d' : event.status === 'READY' ? '#1d4ed8' : '#c2410c',
                  border: `1px solid ${event.status === 'LIVE' ? '#86efac' : event.status === 'READY' ? '#bfdbfe' : '#fed7aa'}`,
                }}>
                  {event.status === 'LIVE' ? '🚀 Event is Live' : event.status === 'READY' ? '✨ Ready to Launch' : '📝 Draft Setup in Progress'}
                </div>
              </div>

              {/* Stepper Grid (4 items) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                {/* Step 1: Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>STEP 1</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a' }}>✓ Done</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Rules</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{event.teamCount} teams · {event.stagesPerTeam} stg</div>
                </div>

                {/* Step 2: Teams */}
                <Link
                  href={`/organizer/events/${eventId}/teams`}
                  style={{
                    textDecoration: 'none',
                    background: isTeamsReady ? '#f0fdf4' : '#fff',
                    border: isTeamsReady ? '1px solid #bbf7d0' : '1.5px solid #fed7aa',
                    borderRadius: 12,
                    padding: '12px',
                    display: 'block',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isTeamsReady ? '#16a34a' : '#c2410c' }}>STEP 2</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isTeamsReady ? '#16a34a' : '#FF6B35' }}>
                      {isTeamsReady ? '✓ Complete' : 'In Progress'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Teams &rarr;</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{event._count.teams}/{event.teamCount} added</div>
                </Link>

                {/* Step 3: Clues */}
                <Link
                  href={`/organizer/events/${eventId}/clues`}
                  style={{
                    textDecoration: 'none',
                    background: isCluesReady ? '#f0fdf4' : '#fff',
                    border: isCluesReady ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '12px',
                    display: 'block',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isCluesReady ? '#16a34a' : '#64748b' }}>STEP 3</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isCluesReady ? '#16a34a' : '#64748b' }}>
                      {isCluesReady ? '✓ Complete' : `${event._count.clues}/${totalExpectedClues}`}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Clues &rarr;</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Riddles & codes</div>
                </Link>

                {/* Step 4: QR Codes */}
                <Link
                  href={`/organizer/events/${eventId}/qr`}
                  style={{
                    textDecoration: 'none',
                    background: isQrReady ? '#f0fdf4' : '#fff',
                    border: isQrReady ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '12px',
                    display: 'block',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isQrReady ? '#16a34a' : '#64748b' }}>STEP 4</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isQrReady ? '#16a34a' : '#64748b' }}>
                      {isQrReady ? '✓ Ready' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>QR Cards &rarr;</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{event._count.qrCodes} generated</div>
                </Link>
              </div>

              {/* Action prompt if in DRAFT */}
              {event.status === 'DRAFT' && (
                <div style={{
                  background: isAllReadyForLaunch ? '#f0fdf4' : '#fffaf5',
                  border: `1px solid ${isAllReadyForLaunch ? '#bbf7d0' : '#fed7aa'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isAllReadyForLaunch ? '#166534' : '#9a3412' }}>
                      {isAllReadyForLaunch ? '🎉 All preparation steps complete!' : 'Next setup task:'}
                    </div>
                    <div style={{ fontSize: 12, color: isAllReadyForLaunch ? '#15803d' : '#64748b', marginTop: 2 }}>
                      {isAllReadyForLaunch
                        ? 'Your teams, clues, and QR codes are ready. Mark the event as READY below to allow teams to log in.'
                        : !isTeamsReady
                        ? `Add remaining teams (${event.teamCount - event._count.teams} left to configure).`
                        : !isCluesReady
                        ? 'Enter riddles and clues for each stage.'
                        : 'Generate QR codes to enable token scanning.'}
                    </div>
                  </div>

                  {!isTeamsReady ? (
                    <Link
                      href={`/organizer/events/${eventId}/teams`}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 8,
                        background: '#FF6B35',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                      }}
                    >
                      Go to Teams &rarr;
                    </Link>
                  ) : !isCluesReady ? (
                    <Link
                      href={`/organizer/events/${eventId}/clues`}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 8,
                        background: '#FF6B35',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                      }}
                    >
                      Write Clues &rarr;
                    </Link>
                  ) : !isQrReady ? (
                    <Link
                      href={`/organizer/events/${eventId}/qr`}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 8,
                        background: '#FF6B35',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                      }}
                    >
                      Generate QR Codes &rarr;
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            /* Quiz / Funtakshari Setup Flow */
            <div style={{
              background: '#fff',
              border: '1.5px solid #bae6fd',
              borderRadius: 16,
              padding: '22px 24px',
              boxShadow: '0 4px 20px rgba(56, 189, 248, 0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#0284c7', textTransform: 'uppercase' }}>
                    Score Game Setup
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    Teams & Live Scorekeeper
                  </div>
                </div>
                <Link
                  href={`/organizer/events/${eventId}/scores`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  <span>⭐ Launch Scorekeeper</span>
                  <span>&rarr;</span>
                </Link>
              </div>
              <div style={{ fontSize: 12.5, color: '#475569' }}>
                1. Configure your teams in <strong>Manage Teams</strong> &rarr; 2. Open <strong>Give Score</strong> to tap +5/+10/-5/-10 live &rarr; 3. Project <strong>Live Scoreboard</strong> for the audience.
              </div>
            </div>
          )}

          {/* EVENT LIFECYCLE & STATUS CARD */}
          {!isScoreGame && (
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 14 }}>
                Event Lifecycle & Status Control
              </div>

              {/* Stepper with current status */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, overflowX: 'auto', paddingBottom: 4 }}>
                {ORDER.map((status, i) => {
                  const done = i < ci, cur = i === ci
                  const sm = STATUS_STYLE[status]
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                          fontSize: 11, fontWeight: 700,
                          background: cur ? sm.dot : done ? '#0f172a' : '#e2e8f0',
                          color: cur || done ? '#fff' : '#64748b',
                          boxShadow: cur ? `0 0 0 4px ${sm.bg}` : 'none',
                        }}>
                          {done ? '✓' : i + 1}
                        </span>
                        <span style={{ fontWeight: cur ? 700 : 500, fontSize: 12.5, color: cur ? '#0f172a' : '#64748b' }}>{status}</span>
                      </div>
                      {i < 4 && <div style={{ flex: 1, height: 2, margin: '0 10px', minWidth: 16, background: done ? '#0f172a' : '#e2e8f0' }} />}
                    </div>
                  )
                })}
              </div>

              <div>
                <EventStatusActions eventId={event.id} currentStatus={event.status} />
              </div>
            </div>
          )}

          {/* EVENT DESCRIPTION CARD (If present) */}
          {event.description && (
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '18px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                Description & Rules
              </div>
              <div style={{ color: '#334155', lineHeight: 1.5, fontSize: 13 }}>
                {event.description}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Event Workspace Directory & Tool Consoles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Main Workspace Directory Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#64748b', textTransform: 'uppercase' }}>
                  Workspace Tools
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                  Management Directory
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                {links.length} Tools
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: l.isHero ? '14px 16px' : '11px 14px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.15s ease',
                    background: l.isHero
                      ? 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)'
                      : 'rgba(248, 250, 252, 0.7)',
                    border: l.isHero
                      ? '1.5px solid #fdba74'
                      : '1px solid #f1f5f9',
                    boxShadow: l.isHero
                      ? '0 2px 10px rgba(255, 107, 53, 0.12)'
                      : 'none',
                  }}
                >
                  <div style={{
                    width: l.isHero ? 36 : 32,
                    height: l.isHero ? 36 : 32,
                    borderRadius: 8,
                    background: l.isHero ? 'linear-gradient(135deg, #FFA23A, #FF6B35)' : '#fff1ea',
                    color: l.isHero ? '#fff' : '#e8541f',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    boxShadow: l.isHero ? '0 2px 6px rgba(255,107,53,0.3)' : 'none',
                  }}>
                    <svg width={l.isHero ? 18 : 15} height={l.isHero ? 18 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={l.icon} />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: l.isHero ? 700 : 600, fontSize: l.isHero ? 13.5 : 13, color: l.isHero ? '#c2410c' : '#0f172a' }}>
                        {l.label}
                      </span>
                      {l.badge && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: l.isHero ? '#FF6B35' : '#f1f5f9',
                          color: l.isHero ? '#fff' : '#64748b',
                        }}>
                          {l.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.sub}
                    </div>
                  </div>

                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={l.isHero ? '#ea580c' : '#94a3b8'} strokeWidth={2.5} strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Specifications Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '18px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
              Event Configuration Summary
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Game Type:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {event.gameType === 'QUIZ' ? 'Brain Quiz' : event.gameType === 'FUNTAKSHARI' ? 'Music Funtakshari' : 'Treasure Hunt'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Teams Configured:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{event.teamCount} Teams</span>
              </div>
              {!isScoreGame ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Stages per Team:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{event.stagesPerTeam} Stages</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Common Final QR:</span>
                    <span style={{ fontWeight: 700, color: event.hasCommonFinalQr ? '#16a34a' : '#64748b' }}>
                      {event.hasCommonFinalQr ? 'Enabled (1 card)' : 'Disabled'}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Roster Size:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{event.membersPerTeam || 4} members / team</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
