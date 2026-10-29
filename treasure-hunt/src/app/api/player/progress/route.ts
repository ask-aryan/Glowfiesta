import { NextResponse } from 'next/server'
import { requireTeam } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const { session, error } = await requireTeam()
  if (error) return error

  const team = await prisma.team.findUnique({
    where: { id: session!.teamId },
    include: { event: { select: { status: true, name: true, stagesPerTeam: true } } },
  })

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const stageProgress = await prisma.teamStageProgress.findMany({
    where: { teamId: session!.teamId },
    orderBy: { stageNumber: 'asc' },
  })

  return NextResponse.json({
    teamName: team.teamName,
    teamStatus: team.status,
    currentStage: team.currentStage,
    eventStatus: team.event.status,
    eventName: team.event.name,
    stagesPerTeam: team.event.stagesPerTeam,
    stages: stageProgress.map(p => ({
      stageNumber: p.stageNumber,
      status: p.status,
      scanTimestamp: p.scanTimestamp,
      nextClueReleasedAt: p.nextClueReleasedAt,
      completedAt: p.completedAt,
    })),
  })
}
