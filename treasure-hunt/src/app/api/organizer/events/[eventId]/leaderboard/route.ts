import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const teams = await prisma.team.findMany({
    where: { eventId },
    include: {
      stageProgress: { orderBy: { stageNumber: 'desc' } },
    },
  })

  // Completed teams sorted by completedAt ASC
  const completedTeams = teams
    .filter(t => t.status === 'COMPLETED')
    .map(t => {
      const completedProgress = t.stageProgress.filter(p => p.completedAt).sort((a, b) =>
        (a.completedAt!.getTime() - b.completedAt!.getTime())
      )
      return {
        teamId: t.id,
        teamName: t.teamName,
        status: t.status,
        currentStage: t.stageProgress[0]?.stageNumber ?? 0,
        completedAt: completedProgress[completedProgress.length - 1]?.completedAt ?? null,
        rank: 0,
      }
    })
    .sort((a, b) => {
      if (!a.completedAt) return 1
      if (!b.completedAt) return -1
      return a.completedAt.getTime() - b.completedAt.getTime()
    })
    .map((t, i) => ({ ...t, rank: i + 1 }))

  // Incomplete teams sorted by currentStage DESC
  const incompleteTeams = teams
    .filter(t => t.status !== 'COMPLETED')
    .map(t => {
      const activeStage = t.stageProgress
        .filter(p => p.status !== 'NOT_STARTED')
        .sort((a, b) => b.stageNumber - a.stageNumber)[0]
      return {
        teamId: t.id,
        teamName: t.teamName,
        status: t.status,
        currentStage: activeStage?.stageNumber ?? 0,
        completedAt: null,
        rank: null,
      }
    })
    .sort((a, b) => b.currentStage - a.currentStage)

  return NextResponse.json({ leaderboard: [...completedTeams, ...incompleteTeams] })
}
