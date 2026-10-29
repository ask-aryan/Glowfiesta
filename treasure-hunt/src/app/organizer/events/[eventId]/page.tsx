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
  searchParams,
}: {
  params: { eventId: string }
  searchParams?: { step?: string }
}) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const event = await getEvent(eventId)
  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  const st = STATUS_STYLE[event.status] ?? STATUS_STYLE.DRAFT
  const ci = ORDER.indexOf(event.status)

  const isScoreGame = event.gameType === 'QUIZ' || event.gameType === 'FUNTAKSHARI'

  const stats = isScoreGame
    ? [
        { label: 'Registered Teams', value: event._count.teams },
        { label: 'Members / Team', value: event.membersPerTeam || 4 },
        { label: 'Game Type', value: event.gameType === 'QUIZ' ? 'Quiz' : 'Funtakshari' },
        { label: 'Scoreboard', value: 'Live Animated' },
      ]
    : [
        { label: 'Teams', value: event._count.teams },
        { label: 'Clues', value: event._count.clues },
        { label: 'QR Codes', value: event._count.qrCodes },
        { label: 'Stages / Team', value: event.stagesPerTeam },
      ]

  const links = isScoreGame
    ? [
        { href: `/organizer/events/${eventId}/scores`, label: '⭐ Give Score (Scorekeeper)', sub: 'Fast 2x2 interactive scoring buttons with instant undo', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', isHero: true },
        { href: `/organizer/events/${eventId}/teams`, label: 'Manage Teams', sub: `${event._count.teams} teams (Leader & Members)`, icon: IC.teams },
        { href: `/scoreboard/${eventId}`, label: 'Live Scoreboard ↗', sub: 'Projector screen with animated happy/sad reactions', icon: 'M2 3h20v14H2zm6 18h8m-4-4v4' },
      ]
    : [
        { href: `/organizer/events/${eventId}/progress`, label: '⚡ Live Progress', sub: 'Main command center: real-time stages & reception desk verification', icon: IC.prog, isHero: true },
        { href: `/organizer/events/${eventId}/teams`, label: 'Manage Teams', sub: `${event._count.teams} teams`, icon: IC.teams },
        { href: `/organizer/events/${eventId}/clues`, label: 'Manage Clues', sub: `${event._count.clues} clues`, icon: IC.clues },
        { href: `/organizer/events/${eventId}/qr`, label: 'QR Codes', sub: `${event._count.qrCodes} codes`, icon: IC.qr },
        { href: `/organizer/events/${eventId}/selfies`, label: 'Team Selfies', sub: 'View photos & ZIP export', icon: IC.selfie },
      ]

  const totalExpectedClues = event.stagesPerTeam * event._count.teams + (event.hasCommonFinalQr ? 1 : 0)
  const isTeamsReady = event._count.teams >= event.teamCount
  const isCluesReady = event._count.clues >= (totalExpectedClues > 0 ? totalExpectedClues : 1)
  const isQrReady = event._count.qrCodes > 0
  const isAllReadyForLaunch = isTeamsReady && isCluesReady && isQrReady

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', marginBottom: 6, fontSize: 13 }}>
        <Link href="/organizer" style={{ color: '#64748b', textDecoration: 'none' }}>Events</Link>
        <span>/</span>
        <span>{event.name}</span>
      </div>

      {/* Header with Title, Status, and Edit Event Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: '#0f172a' }}>{event.name}</div>
          {isScoreGame ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.fg }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, animation: st.anim, flexShrink: 0 }} />
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

      {/* Top Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, background: '#fff' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ padding: '16px 20px', borderLeft: i ? '1px solid #e5e7eb' : 'none' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: '#0f172a' }}>{s.value}</div>
            <div style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* GUIDED SETUP FLOW WIZARD (Treasure Hunt & Score Games) */}
      {!isScoreGame ? (
        <div style={{
          background: '#fff',
          border: '1.5px solid #fed7aa',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.06)',
          maxWidth: 820,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#FF6B35', textTransform: 'uppercase' }}>
                Setup & Preparation Wizard
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                Event Setup Flow
              </div>
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: event.status === 'LIVE' ? '#dcfce7' : event.status === 'READY' ? '#dbeafe' : '#fff7ed',
              color: event.status === 'LIVE' ? '#15803d' : event.status === 'READY' ? '#1d4ed8' : '#c2410c',
            }}>
              {event.status === 'LIVE' ? '🚀 Event is Live' : event.status === 'READY' ? '✨ Ready to Launch' : '📝 Draft Setup in Progress'}
            </div>
          </div>

          {/* Stepper items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            {/* Step 1: Details */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>STEP 1</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>✓ Configured</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Event Rules</div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{event.teamCount} teams · {event.stagesPerTeam} stages</div>
            </div>

            {/* Step 2: Teams */}
            <Link
              href={`/organizer/events/${eventId}/teams`}
              style={{
                textDecoration: 'none',
                background: isTeamsReady ? '#f0fdf4' : '#fff',
                border: isTeamsReady ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isTeamsReady ? '#16a34a' : '#c2410c' }}>STEP 2</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isTeamsReady ? '#16a34a' : '#FF6B35' }}>
                  {isTeamsReady ? '✓ Complete' : 'In Progress'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Add Teams &rarr;</div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{event._count.teams} / {event.teamCount} registered</div>
            </Link>

            {/* Step 3: Clues */}
            <Link
              href={`/organizer/events/${eventId}/clues`}
              style={{
                textDecoration: 'none',
                background: isCluesReady ? '#f0fdf4' : '#fff',
                border: isCluesReady ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isCluesReady ? '#16a34a' : '#64748b' }}>STEP 3</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isCluesReady ? '#16a34a' : '#64748b' }}>
                  {isCluesReady ? '✓ Complete' : `${event._count.clues}/${totalExpectedClues || '—'}`}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Write Clues &rarr;</div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Riddles & 4-digit codes</div>
            </Link>

            {/* Step 4: QR Codes */}
            <Link
              href={`/organizer/events/${eventId}/qr`}
              style={{
                textDecoration: 'none',
                background: isQrReady ? '#f0fdf4' : '#fff',
                border: isQrReady ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'block',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isQrReady ? '#16a34a' : '#64748b' }}>STEP 4</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isQrReady ? '#16a34a' : '#64748b' }}>
                  {isQrReady ? '✓ Ready' : 'Pending'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Generate QR &rarr;</div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{event._count.qrCodes} codes generated</div>
            </Link>
          </div>

          {/* Action prompt if in DRAFT */}
          {event.status === 'DRAFT' && (
            <div style={{
              background: isAllReadyForLaunch ? '#f0fdf4' : '#fffaf5',
              border: `1px solid ${isAllReadyForLaunch ? '#bbf7d0' : '#fed7aa'}`,
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isAllReadyForLaunch ? '#166534' : '#9a3412' }}>
                  {isAllReadyForLaunch ? '🎉 All steps complete! Ready to launch!' : 'Next setup task:'}
                </div>
                <div style={{ fontSize: 12, color: isAllReadyForLaunch ? '#15803d' : '#64748b', marginTop: 2 }}>
                  {isAllReadyForLaunch
                    ? 'Your teams, clues, and QR codes are ready. Mark the event as READY below so teams can log in!'
                    : !isTeamsReady
                    ? `Add remaining teams (${event.teamCount - event._count.teams} left to configure).`
                    : !isCluesReady
                    ? 'Enter riddles and clues for each stage.'
                    : 'Generate QR codes to enable physical token scanning.'}
                </div>
              </div>

              {!isTeamsReady ? (
                <Link
                  href={`/organizer/events/${eventId}/teams`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#FF6B35',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12.5,
                    textDecoration: 'none',
                  }}
                >
                  Go to Teams &rarr;
                </Link>
              ) : !isCluesReady ? (
                <Link
                  href={`/organizer/events/${eventId}/clues`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#FF6B35',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12.5,
                    textDecoration: 'none',
                  }}
                >
                  Write Clues &rarr;
                </Link>
              ) : !isQrReady ? (
                <Link
                  href={`/organizer/events/${eventId}/qr`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#FF6B35',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12.5,
                    textDecoration: 'none',
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
          padding: '20px 24px',
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(56, 189, 248, 0.08)',
          maxWidth: 820,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#0284c7', textTransform: 'uppercase' }}>
                Score Game Setup
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
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

      {/* EVENT LIFECYCLE CONTROLS */}
      {!isScoreGame && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', marginBottom: 12 }}>
            EVENT LIFECYCLE & STATUS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, maxWidth: 760 }}>
            {ORDER.map((status, i) => {
              const done = i < ci, cur = i === ci
              const sm = STATUS_STYLE[status]
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: cur ? sm.dot : done ? '#0f172a' : '#e2e8f0',
                      color: cur || done ? '#fff' : '#64748b',
                      boxShadow: cur ? `0 0 0 4px ${sm.bg}` : 'none',
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ fontWeight: cur ? 700 : 500, color: cur ? '#0f172a' : '#64748b' }}>{status}</span>
                  </div>
                  {i < 4 && <div style={{ flex: 1, height: 2, margin: '0 12px', background: done ? '#0f172a' : '#e2e8f0' }} />}
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 32 }}>
            <EventStatusActions eventId={event.id} currentStatus={event.status} />
          </div>
        </>
      )}

      {/* WORKSPACE DIRECTORY LINKS */}
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', marginBottom: 4 }}>
        EVENT WORKSPACE
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', maxWidth: 760, marginTop: 8 }}>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="manage-link"
            style={l.isHero ? {
              background: 'linear-gradient(135deg, #fff7ed 0%, #fff 100%)',
              border: '1.5px solid #fdba74',
              borderRadius: 12,
              marginBottom: 8,
              boxShadow: '0 2px 8px rgba(255, 107, 53, 0.1)',
            } : undefined}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: l.isHero ? 'linear-gradient(135deg, #FFA23A, #FF6B35)' : '#fff1ea',
              color: l.isHero ? '#fff' : '#e8541f',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              boxShadow: l.isHero ? '0 2px 6px rgba(255,107,53,0.3)' : 'none',
            }}>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d={l.icon} />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: l.isHero ? 700 : 600, fontSize: l.isHero ? 14 : 13, color: l.isHero ? '#c2410c' : '#0f172a' }}>
                {l.label}
              </div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{l.sub}</div>
            </div>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={l.isHero ? '#ea580c' : '#94a3b8'} strokeWidth={2.5} strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </div>

      {event.description && (
        <div style={{ marginTop: 28, maxWidth: 760 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', marginBottom: 6 }}>DESCRIPTION</div>
          <div style={{ color: '#334155', lineHeight: 1.5 }}>{event.description}</div>
        </div>
      )}
    </div>
  )
}
