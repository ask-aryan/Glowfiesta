import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      gameType: true,
      status: true,
      stagesPerTeam: true,
      teamCount: true,
      hasCommonFinalQr: true,
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const teams = await prisma.team.findMany({
    where: { eventId },
    include: {
      stageProgress: { orderBy: { stageNumber: 'asc' } },
      scanHistory: { orderBy: { scannedAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  })

  const totalStages = event.stagesPerTeam
  const hasFinal = event.hasCommonFinalQr

  // Max effective milestone count (e.g. 5 stages + 1 final = 6 milestones)
  const maxMilestone = totalStages + (hasFinal ? 1 : 0)

  const raceTeams = teams.map((team, idx) => {
    const latestScan = team.scanHistory[0]
    const awaitingVerification = team.stageProgress.some(p => p.status === 'AWAITING_RECEPTION_VERIFICATION')
    const completedStages = team.stageProgress.filter(p => p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED').length

    const isAllStagesDone = completedStages >= totalStages
    const isCompleted = team.status === 'COMPLETED'

    // Calculate progression index (0 = Start line, 1..N = stages, N+1 = Final completed)
    let currentMilestone = completedStages
    if (isCompleted) {
      currentMilestone = maxMilestone
    } else if (isAllStagesDone && hasFinal) {
      currentMilestone = totalStages // at final hurdle
    }

    // Progress percentage from 0% (start) to 100% (victory)
    const progressPercent = maxMilestone > 0
      ? Math.min(100, Math.round((currentMilestone / maxMilestone) * 100))
      : 0

    return {
      id: team.id,
      teamName: team.teamName,
      leaderName: team.leaderName ?? null,
      members: team.members ?? null,
      initialOrder: idx + 1,
      status: team.status,
      currentMilestone,
      completedStages,
      totalStages,
      progressPercent,
      awaitingVerification,
      isCompleted,
      lastScanTime: latestScan?.scannedAt ?? null,
    }
  })

  // Sort race standings: highest milestone first, then fastest completion/last scan
  const standings = [...raceTeams].sort((a, b) => {
    if (b.isCompleted !== a.isCompleted) return b.isCompleted ? 1 : -1
    if (b.currentMilestone !== a.currentMilestone) return b.currentMilestone - a.currentMilestone
    if (a.awaitingVerification !== b.awaitingVerification) return a.awaitingVerification ? -1 : 1
    return (a.initialOrder ?? a.id) - (b.initialOrder ?? b.id)
  })

  return NextResponse.json({
    event,
    totalStages,
    hasFinal,
    maxMilestone,
    teams: raceTeams,
    standings,
  })
}
