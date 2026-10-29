import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import CreateEventPanel from './CreateEventForm'
import EventRowActions from './EventRowActions'

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
                <EventRowActions eventId={ev.id} name={ev.name} description={ev.description} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
