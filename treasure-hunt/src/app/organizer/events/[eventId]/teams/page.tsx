import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import AddTeamPanel from './AddTeamForm'
import TeamRowActions from './TeamRowActions'
import PasswordCell from './PasswordCell'

async function getTeams(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.team.findMany({
    where: { eventId },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

async function getEvent(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, id: true, gameType: true, membersPerTeam: true },
  })
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

export default async function TeamsPage({ params }: { params: { eventId: string } }) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const [event, teams] = await Promise.all([getEvent(eventId), getTeams(eventId)])

  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  const isScoreGame = event.gameType === 'QUIZ' || event.gameType === 'FUNTAKSHARI'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', marginBottom: 6, fontSize: 13 }}>
            <Link href={`/organizer/events/${eventId}`} style={{ color: '#64748b', textDecoration: 'none' }}>{event.name}</Link>
            <span>/</span>
            <span>Teams</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: '#0f172a' }}>
            Registered Teams <span style={{ color: '#94a3b8', fontWeight: 500 }}>({teams.length})</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isScoreGame && (
            <Link
              href={`/organizer/events/${eventId}/scores`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 8,
                background: '#1e293b',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <span>⭐</span> Give Score
            </Link>
          )}
          <AddTeamPanel eventId={eventId} gameType={event.gameType} />
        </div>
      </div>

      {isScoreGame && (
        <div
          style={{
            background: '#fffdf5',
            border: '1.5px solid #fef08a',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <span>
              <strong>Offline Score Tracking:</strong> Teams do not need credentials to log in. Add your team names, leaders, and members here.
            </span>
          </div>
          <Link
            href={`/scoreboard/${eventId}`}
            target="_blank"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#d97706',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Open Live Projector Scoreboard ↗
          </Link>
        </div>
      )}

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#1e293b' }}>No teams registered yet</div>
          <div style={{ fontSize: 14 }}>Click &quot;+ Add Team&quot; above to create your first team</div>
        </div>
      ) : isScoreGame ? (
        /* Score Game Table (Quiz & Funtakshari) */
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.5fr) 110px 72px',
              gap: 12,
              padding: '12px 16px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.06em',
              color: '#64748b',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>#</div>
            <div>TEAM NAME</div>
            <div>TEAM LEADER</div>
            <div>MEMBERS</div>
            <div>CURRENT SCORE</div>
            <div />
          </div>

          {teams.map((team, i) => {
            const initials = team.teamName.trim().slice(0, 2).toUpperCase()
            const color = COLORS[i % COLORS.length]
            return (
              <div
                key={team.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.5fr) 110px 72px',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: i === teams.length - 1 ? 'none' : '1px solid #f1f5f9',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: '#0f172a' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </span>
                  <span>{team.teamName}</span>
                </div>
                <div style={{ color: team.leaderName ? '#334155' : '#94a3b8', fontSize: 13, fontWeight: team.leaderName ? 600 : 400 }}>
                  {team.leaderName || '—'}
                </div>
                <div style={{ color: team.members ? '#475569' : '#94a3b8', fontSize: 12, lineHeight: 1.35 }}>
                  {team.members || '—'}
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: team.score > 0 ? '#dcfce7' : team.score < 0 ? '#fee2e2' : '#f1f5f9',
                      color: team.score > 0 ? '#15803d' : team.score < 0 ? '#b91c1c' : '#475569',
                      fontWeight: 800,
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {team.score > 0 ? `+${team.score}` : team.score} pts
                  </span>
                </div>
                <TeamRowActions
                  teamId={team.id}
                  eventId={eventId}
                  teamName={team.teamName}
                  leaderName={team.leaderName}
                  members={team.members}
                  isScoreGame={true}
                />
              </div>
            )
          })}
        </div>
      ) : (
        /* Treasure Hunt Table with Usernames & Passwords */
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 130px 72px',
              gap: 12,
              padding: '12px 16px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.06em',
              color: '#64748b',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>#</div>
            <div>TEAM NAME</div>
            <div>USERNAME</div>
            <div>PASSWORD</div>
            <div>STATUS</div>
            <div />
          </div>

          {teams.map((team, i) => {
            const initials = team.teamName.trim().slice(0, 2).toUpperCase()
            const color = COLORS[i % COLORS.length]
            return (
              <div
                key={team.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 130px 72px',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: i === teams.length - 1 ? 'none' : '1px solid #f1f5f9',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </span>
                  {team.teamName}
                </div>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>
                    {team.user?.username || '—'}
                  </span>
                </div>
                <div>
                  <PasswordCell password={team.plainPassword || ''} />
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: team.status === 'COMPLETED' ? '#dcfce7' : '#fff1ea',
                      color: team.status === 'COMPLETED' ? '#15803d' : '#c2410c',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: team.status === 'COMPLETED' ? '#22c55e' : '#FF6B35', flexShrink: 0 }} />
                    {team.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}
                  </span>
                </div>
                <TeamRowActions
                  teamId={team.id}
                  eventId={eventId}
                  teamName={team.teamName}
                  leaderName={team.leaderName}
                  members={team.members}
                  isScoreGame={false}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
