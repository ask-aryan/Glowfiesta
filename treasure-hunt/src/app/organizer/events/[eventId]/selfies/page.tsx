import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

async function getSelfies(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.selfie.findMany({
    where: { eventId },
    include: { team: { select: { teamName: true } } },
    orderBy: { takenAt: 'desc' },
  })
}

async function getEvent(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.event.findUnique({ where: { id: eventId }, select: { name: true } })
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() }

export default async function SelfiesPage({ params }: { params: { eventId: string } }) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const [event, selfies] = await Promise.all([getEvent(eventId), getSelfies(eventId)])

  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  // Group by team
  const byTeam: Record<string, typeof selfies> = {}
  for (const s of selfies) {
    const k = s.team.teamName
    if (!byTeam[k]) byTeam[k] = []
    byTeam[k].push(s)
  }
  const teams = Object.keys(byTeam).sort()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: '#64748b', marginBottom: 6 }}>{event.name}</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>
          Team Selfies <span style={{ color: '#94a3b8', fontWeight: 500 }}>{selfies.length}</span>
        </div>
      </div>

      {selfies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No selfies yet</div>
          <div>Selfies will appear here as teams scan QR codes during the event</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {teams.map((teamName, ti) => {
            const color = COLORS[ti % COLORS.length]
            const teamSelfies = byTeam[teamName]
            return (
              <div key={teamName}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {initials(teamName)}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{teamName}</span>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{teamSelfies.length} photo{teamSelfies.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {teamSelfies.map(s => (
                    <div key={s.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.imageData}
                        alt={`${teamName} selfie`}
                        style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            padding: '2px 8px',
                            background: s.stageNumber ? '#e0f2fe' : '#fef3c7',
                            color: s.stageNumber ? '#0369a1' : '#b45309',
                          }}>
                            {s.stageNumber ? `Stage ${s.stageNumber}` : '🏆 Final'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(s.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
