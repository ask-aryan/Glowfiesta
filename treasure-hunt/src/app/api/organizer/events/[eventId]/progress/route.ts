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

  const [event, teams, clues] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        status: true,
        stagesPerTeam: true,
        maxHintsPerTeam: true,
        hintDelayMinutes: true,
      },
    }),
    prisma.team.findMany({
      where: { eventId },
      include: {
        stageProgress: { orderBy: { stageNumber: 'asc' } },
        scanHistory: { orderBy: { scannedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.clue.findMany({
      where: { eventId },
      select: {
        teamId: true,
        stageNumber: true,
        clueText: true,
        resultCode: true,
      },
    }),
  ])

  const result = teams.map(team => {
    const latestScan = team.scanHistory[0]
    const awaitingVerification = team.stageProgress.some(p => p.status === 'AWAITING_RECEPTION_VERIFICATION')
    const pendingStages = team.stageProgress.filter(p => p.status === 'AWAITING_RECEPTION_VERIFICATION')

    // Current stage = highest released/scanned stage
    const activeStage = team.stageProgress
      .filter(p => p.status !== 'NOT_STARTED')
      .sort((a, b) => b.stageNumber - a.stageNumber)[0]

    const completedAt = team.stageProgress
      .filter(p => p.status === 'COMPLETED' && p.completedAt)
      .sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()))[0]?.completedAt ?? null

    const hintsUsed = team.stageProgress.filter(p => p.usedHint).length
    const activeHintStages = team.stageProgress
      .filter(p => p.usedHint && p.status !== 'COMPLETED' && p.status !== 'NEXT_CLUE_RELEASED')
      .map(p => {
        const clue = clues.find(c => (c.teamId === team.id || c.teamId === null) && c.stageNumber === p.stageNumber)
        return {
          stageNumber: p.stageNumber,
          hintRequestedAt: p.hintRequestedAt,
          clueText: clue?.clueText ?? null,
          resultCode: clue?.resultCode ?? null,
        }
      })

    return {
      teamId: team.id,
      teamName: team.teamName,
      leaderName: team.leaderName ?? null,
      members: team.members ?? null,
      status: team.status,
      currentStage: activeStage?.stageNumber ?? 0,
      lastScanTime: latestScan?.scannedAt ?? null,
      awaitingVerification,
      pendingStages: pendingStages.map(p => p.stageNumber),
      completedAt,
      hintsUsed,
      activeHintStages,
    }
  })

  return NextResponse.json({
    event: event ? {
      id: event.id,
      name: event.name,
      status: event.status,
      maxHintsPerTeam: event.maxHintsPerTeam,
      hintDelayMinutes: event.hintDelayMinutes,
    } : null,
    teams: result,
    stagesPerTeam: event?.stagesPerTeam ?? 5,
  })
}
