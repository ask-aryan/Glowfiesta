import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAudit } from '@/lib/audit'
import { EventStatus } from '@prisma/client'

const VALID_TRANSITIONS: Record<string, { action: string; nextStatus: EventStatus }[]> = {
  DRAFT:     [{ action: 'start', nextStatus: 'READY' }],
  READY:     [{ action: 'start', nextStatus: 'LIVE' }],
  LIVE:      [
    { action: 'pause', nextStatus: 'PAUSED' },
    { action: 'close', nextStatus: 'COMPLETED' },
  ],
  PAUSED:    [
    { action: 'resume', nextStatus: 'LIVE' },
    { action: 'close', nextStatus: 'COMPLETED' },
  ],
  COMPLETED: [],
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { session, error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const body = await req.json()
  const { action } = body as { action: string }

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const transitions = VALID_TRANSITIONS[event.status] ?? []
  const transition = transitions.find(t => t.action === action)
  if (!transition) {
    return NextResponse.json(
      { error: `Action '${action}' is not valid for event in status '${event.status}'` },
      { status: 400 }
    )
  }

  // Validate all prerequisite steps before marking event as READY
  if (event.status === 'DRAFT' && transition.nextStatus === 'READY') {
    const isScoreGame = event.gameType === 'QUIZ' || event.gameType === 'FUNTAKSHARI'
    const [teamsCount, cluesCount, qrCodesCount] = await Promise.all([
      prisma.team.count({ where: { eventId } }),
      prisma.clue.count({ where: { eventId } }),
      prisma.qrCode.count({ where: { eventId } }),
    ])

    const totalExpectedClues = event.stagesPerTeam * event.teamCount + (event.hasCommonFinalQr ? 1 : 0)
    const missing: string[] = []

    if (teamsCount < event.teamCount) {
      missing.push(`Register all teams (${teamsCount}/${event.teamCount} added)`)
    }

    if (!isScoreGame) {
      if (cluesCount < totalExpectedClues) {
        missing.push(`Write all clues (${cluesCount}/${totalExpectedClues} written)`)
      }
      if (qrCodesCount === 0) {
        missing.push('Generate QR codes')
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Cannot mark event as READY. Please complete all preparation steps: ${missing.join(', ')}` },
        { status: 400 }
      )
    }
  }

  const isGoingLive = transition.nextStatus === 'LIVE'
  const now = new Date()

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: transition.nextStatus,
      ...(isGoingLive && !event.startsAt ? { startsAt: now } : {}),
    },
  })

  if (isGoingLive) {
    // Stamp stage 1 start time for all teams so hint countdown begins
    await prisma.teamStageProgress.updateMany({
      where: {
        eventId,
        stageNumber: 1,
        stageStartedAt: null,
      },
      data: {
        stageStartedAt: now,
      },
    })
  }

  await writeAudit({
    eventId,
    actorUserId: session!.userId!,
    action: `STATUS_${action.toUpperCase()}`,
    entityType: 'Event',
    entityId: eventId,
    reason: `Status changed from ${event.status} to ${transition.nextStatus}`,
  })

  return NextResponse.json({ event: updated })
}
