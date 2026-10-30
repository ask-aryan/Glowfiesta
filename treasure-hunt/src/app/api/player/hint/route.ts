import { NextRequest, NextResponse } from 'next/server'
import { requireTeam } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAudit } from '@/lib/audit'
import { requestHintSchema } from '@/lib/validation/event'

export async function POST(req: NextRequest) {
  const { session, error } = await requireTeam()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const parsed = requestHintSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid stage number' }, { status: 400 })
  }

  const { stageNumber } = parsed.data

  const team = await prisma.team.findUnique({
    where: { id: session!.teamId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          status: true,
          stagesPerTeam: true,
          hasCommonFinalQr: true,
          maxHintsPerTeam: true,
          hintDelayMinutes: true,
          startsAt: true,
        },
      },
      stageProgress: { orderBy: { stageNumber: 'asc' } },
    },
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  if (team.event.status !== 'LIVE' && team.event.status !== 'PAUSED') {
    return NextResponse.json({ error: 'Event is not currently active' }, { status: 400 })
  }

  if (team.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Team has already completed the hunt' }, { status: 400 })
  }

  // Final and Final-1 stages are NOT eligible for hints
  // When hasCommonFinalQr = true: Final is Common Final QR, Final-1 is stagesPerTeam. Eligible: 1 .. stagesPerTeam - 1.
  // When hasCommonFinalQr = false: Final is stagesPerTeam, Final-1 is stagesPerTeam - 1. Eligible: 1 .. stagesPerTeam - 2.
  const maxEligibleStage = team.event.hasCommonFinalQr
    ? team.event.stagesPerTeam - 1
    : team.event.stagesPerTeam - 2

  if (stageNumber > maxEligibleStage) {
    return NextResponse.json(
      { error: 'Hints are not available for the final or second-to-final stage.' },
      { status: 400 }
    )
  }

  // Find the target stage progress
  const progress = team.stageProgress.find(p => p.stageNumber === stageNumber)
  if (!progress) {
    return NextResponse.json({ error: `Stage ${stageNumber} not found` }, { status: 404 })
  }

  if (progress.status === 'COMPLETED' || progress.status === 'NEXT_CLUE_RELEASED') {
    return NextResponse.json({ error: `Stage ${stageNumber} is already completed` }, { status: 400 })
  }

  // Ensure stage is currently active
  const isStageActive =
    stageNumber === 1 ||
    team.stageProgress.some(
      p => p.stageNumber === stageNumber - 1 && (p.status === 'NEXT_CLUE_RELEASED' || p.status === 'COMPLETED')
    )

  if (!isStageActive) {
    return NextResponse.json({ error: `Stage ${stageNumber} is not active yet` }, { status: 400 })
  }

  // Check if team has already used a hint on this specific stage (1 hint per stage limit)
  if (progress.usedHint) {
    return NextResponse.json(
      { error: `A hint has already been used on Stage ${stageNumber}. Only 1 hint per stage is allowed.` },
      { status: 400 }
    )
  }

  // Check total hints quota across the entire event
  const hintsUsed = team.stageProgress.filter(p => p.usedHint).length
  if (hintsUsed >= team.event.maxHintsPerTeam) {
    return NextResponse.json(
      { error: `You have reached the maximum of ${team.event.maxHintsPerTeam} hints for your team.` },
      { status: 400 }
    )
  }

  // Calculate time spent on this stage
  const prevStage = team.stageProgress.find(p => p.stageNumber === stageNumber - 1)
  const stageStartTime =
    progress.stageStartedAt ??
    (stageNumber === 1 ? (team.event.startsAt ?? team.createdAt) : prevStage?.nextClueReleasedAt ?? team.createdAt)

  const timeSpentMs = Date.now() - new Date(stageStartTime).getTime()
  const minutesSpent = timeSpentMs / (1000 * 60)

  if (minutesSpent < team.event.hintDelayMinutes) {
    const remainingMinutes = Math.ceil(team.event.hintDelayMinutes - minutesSpent)
    return NextResponse.json(
      { error: `Hint is locked. You must spend at least ${team.event.hintDelayMinutes} min on this stage (${remainingMinutes} min remaining).` },
      { status: 400 }
    )
  }

  // Mark hint as used/requested for this stage
  const now = new Date()
  await prisma.teamStageProgress.update({
    where: { id: progress.id },
    data: {
      usedHint: true,
      hintRequestedAt: now,
    },
  })

  await writeAudit({
    eventId: team.event.id,
    actorUserId: session!.userId!,
    action: 'HINT_REQUESTED',
    entityType: 'TeamStageProgress',
    entityId: progress.id,
    reason: `Team "${team.teamName}" requested hint on Stage ${stageNumber} (Used ${hintsUsed + 1}/${team.event.maxHintsPerTeam})`,
  })

  const newHintsUsed = hintsUsed + 1
  const hintsRemaining = Math.max(0, team.event.maxHintsPerTeam - newHintsUsed)

  return NextResponse.json({
    ok: true,
    stageNumber,
    hintsUsed: newHintsUsed,
    maxHints: team.event.maxHintsPerTeam,
    hintsRemaining,
    message: 'Hint requested! Please go to the reception desk to ask the organizer for your hint.',
  })
}
