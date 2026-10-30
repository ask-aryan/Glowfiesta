import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ClueCell from './ClueCell'
import SetupFlowBanner from '@/components/SetupFlowBanner'

async function getData(eventId: number) {
  const { prisma } = await import('@/lib/db')
  const [event, teams, clues] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true, id: true, stagesPerTeam: true, hasCommonFinalQr: true, status: true, teamCount: true } }),
    prisma.team.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, select: { id: true, teamName: true } }),
    prisma.clue.findMany({
      where: { eventId },
      include: { team: { select: { id: true, teamName: true } } },
    }),
  ])
  return { event, teams, clues }
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

export default async function CluesPage({ params }: { params: { eventId: string } }) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const { event, teams, clues } = await getData(eventId)

  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  const stages = Array.from({ length: event.stagesPerTeam }, (_, i) => i + 1)

  // Build clue lookup: teamId_stageNumber → clue
  const clueMap: Record<string, typeof clues[0]> = {}
  const finalClue = clues.find(c => c.isCommonFinal) ?? null
  for (const c of clues) {
    if (!c.isCommonFinal && c.teamId && c.stageNumber) {
      clueMap[`${c.teamId}_${c.stageNumber}`] = c
    }
  }

  const totalClues = clues.filter(c => !c.isCommonFinal).length
  const totalExpected = teams.length * stages.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#64748b', marginBottom: 6 }}>{event.name}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>
            Clues
            <span style={{ color: '#94a3b8', fontWeight: 500 }}> {totalClues}/{totalExpected}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
          <div>Click any cell to add or edit a clue</div>
          <div style={{ marginTop: 3 }}>Code is auto-generated and shown to team after scanning</div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600 }}>Add teams first before entering clues</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr>
                <th style={{ width: 90, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', borderBottom: '2px solid #e5e7eb', background: '#f8fafc' }}>
                  STAGE
                </th>
                {teams.map((t, i) => (
                  <th key={t.id} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', borderBottom: '2px solid #e5e7eb', background: '#f8fafc', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[i % COLORS.length], color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {t.teamName.slice(0, 2).toUpperCase()}
                      </span>
                      {t.teamName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map(stage => (
                <tr key={stage} style={{ borderBottom: '1px solid #eef0f3' }}>
                  <td style={{ padding: '12px', fontWeight: 700, fontSize: 13, color: '#475569', background: '#f8fafc', whiteSpace: 'nowrap' }}>
                    Stage {stage}
                  </td>
                  {teams.map(t => {
                    const clue = clueMap[`${t.id}_${stage}`] ?? null
                    return (
                      <td key={t.id} style={{ padding: '8px', verticalAlign: 'top' }}>
                        <ClueCell
                          clue={clue ? { id: clue.id, clueText: clue.clueText, hintText: clue.hintText, resultCode: clue.resultCode } : null}
                          eventId={eventId}
                          teamId={t.id}
                          stageNumber={stage}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Common Final row */}
              {event.hasCommonFinalQr && (
                <tr style={{ background: '#fffbeb', borderTop: '2px solid #fde68a' }}>
                  <td style={{ padding: '12px', fontWeight: 700, fontSize: 13, color: '#92400e', background: '#fef3c7', whiteSpace: 'nowrap' }}>
                    Final QR
                  </td>
                  <td colSpan={teams.length} style={{ padding: '8px' }}>
                    <ClueCell
                      clue={finalClue ? { id: finalClue.id, clueText: finalClue.clueText, hintText: finalClue.hintText, resultCode: finalClue.resultCode } : null}
                      eventId={eventId}
                      teamId={null}
                      stageNumber={null}
                      isCommonFinal
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Guided Setup Flow Continuity */}
      <SetupFlowBanner
        currentStep="clues"
        eventId={eventId}
        teamsCount={teams.length}
        targetTeams={event.teamCount}
        cluesCount={totalClues}
        targetClues={totalExpected}
        eventStatus={event.status}
      />
    </div>
  )
}
