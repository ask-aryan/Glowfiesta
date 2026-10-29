import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import AddTeamPanel from './AddTeamForm'
import TeamRowActions from './TeamRowActions'

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
  return prisma.event.findUnique({ where: { id: eventId }, select: { name: true, id: true } })
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

export default async function TeamsPage({ params }: { params: { eventId: string } }) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const [event, teams] = await Promise.all([getEvent(eventId), getTeams(eventId)])

  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#64748b', marginBottom: 6 }}>{event.name}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>
            Teams <span style={{ color: '#94a3b8', fontWeight: 500 }}>{teams.length}</span>
          </div>
        </div>
        <AddTeamPanel eventId={eventId} />
      </div>

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No teams yet</div>
          <div>Click &quot;+ Add Team&quot; to create the first team</div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 130px 72px',
            gap: 12, padding: '8px 8px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
            fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', background: '#f8fafc',
          }}>
            <div>#</div><div>TEAM NAME</div><div>USERNAME</div><div>PASSWORD</div><div>STATUS</div><div />
          </div>
          {teams.map((team, i) => {
            const initials = team.teamName.trim().slice(0, 2).toUpperCase()
            const color = COLORS[i % COLORS.length]
            return (
              <TeamRow key={team.id} team={team} i={i} initials={initials} color={color} eventId={eventId} />
            )
          })}
        </>
      )}
    </div>
  )
}

function TeamRow({ team, i, initials, color, eventId }: {
  team: { id: number; teamName: string; plainPassword: string; status: string; user: { username: string } }
  i: number; initials: string; color: string; eventId: number
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '44px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 130px 72px',
      gap: 12, padding: '13px 8px', borderBottom: '1px solid #eef0f3', alignItems: 'center',
    }}>
      <div style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 }}>
          {initials}
        </span>
        {team.teamName}
      </div>
      <div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>
          {team.user.username}
        </span>
      </div>
      <div>
        <PasswordCell password={team.plainPassword} />
      </div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
          borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: team.status === 'COMPLETED' ? '#dcfce7' : '#fff1ea',
          color: team.status === 'COMPLETED' ? '#15803d' : '#c2410c',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: team.status === 'COMPLETED' ? '#22c55e' : '#FF6B35', flexShrink: 0 }} />
          {team.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}
        </span>
      </div>
      <TeamRowActions teamId={team.id} eventId={eventId} teamName={team.teamName} />
    </div>
  )
}

// password reveal is client-only
import PasswordCell from './PasswordCell'
