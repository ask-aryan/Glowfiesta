import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateEventSchema } from '@/lib/validation/event'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { teams: true, clues: true, qrCodes: true } },
    },
  })

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json({ event })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const body = await req.json()
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { teams: true, clues: true, qrCodes: true } },
    },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { name, description, teamCount, stagesPerTeam, membersPerTeam, hasCommonFinalQr, maxHintsPerTeam, hintDelayMinutes, startsAt, endsAt } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description ? description.trim() : null
  if (maxHintsPerTeam !== undefined) updateData.maxHintsPerTeam = maxHintsPerTeam
  if (hintDelayMinutes !== undefined) updateData.hintDelayMinutes = hintDelayMinutes
  if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null
  if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null

  const isEditingStructure =
    (teamCount !== undefined && teamCount !== event.teamCount) ||
    (stagesPerTeam !== undefined && stagesPerTeam !== event.stagesPerTeam) ||
    (membersPerTeam !== undefined && membersPerTeam !== event.membersPerTeam) ||
    (hasCommonFinalQr !== undefined && hasCommonFinalQr !== event.hasCommonFinalQr)

  if (isEditingStructure) {
    if (event.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Team count, stages, and structure can only be modified while the event is in DRAFT status.' },
        { status: 400 }
      )
    }

    if (teamCount !== undefined) {
      if (teamCount < event._count.teams) {
        return NextResponse.json(
          { error: `Cannot reduce team count to ${teamCount} because ${event._count.teams} teams are already registered. Delete extra teams first.` },
          { status: 400 }
        )
      }
      updateData.teamCount = teamCount
    }

    if (stagesPerTeam !== undefined) {
      if (event.gameType === 'TREASURE_HUNT') {
        const higherStageClues = await prisma.clue.count({
          where: { eventId, stageNumber: { gt: stagesPerTeam } },
        })
        if (higherStageClues > 0) {
          return NextResponse.json(
            { error: `Cannot reduce stages to ${stagesPerTeam} because clues already exist for higher stages. Delete or edit those clues first.` },
            { status: 400 }
          )
        }
      }
      updateData.stagesPerTeam = stagesPerTeam
    }

    if (membersPerTeam !== undefined) {
      updateData.membersPerTeam = membersPerTeam
    }

    if (hasCommonFinalQr !== undefined) {
      updateData.hasCommonFinalQr = hasCommonFinalQr
    }

    // If QR codes exist and structure changes in DRAFT, delete existing QRs to allow fresh regeneration
    if (event._count.qrCodes > 0 && (teamCount !== undefined || stagesPerTeam !== undefined || hasCommonFinalQr !== undefined)) {
      await prisma.qrCode.deleteMany({ where: { eventId } })
    }
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  })

  return NextResponse.json({ success: true, event: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  await prisma.$transaction([
    prisma.scanHistory.deleteMany({ where: { eventId } }),
    prisma.teamStageProgress.deleteMany({ where: { eventId } }),
    prisma.qrCode.deleteMany({ where: { eventId } }),
    prisma.clue.deleteMany({ where: { eventId } }),
    prisma.selfie.deleteMany({ where: { eventId } }),
    prisma.team.deleteMany({ where: { eventId } }),
    prisma.auditLog.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { id: eventId } }),
  ])

  return NextResponse.json({ success: true })
}
