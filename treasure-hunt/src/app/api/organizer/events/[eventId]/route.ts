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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      teams: {
        include: { user: { select: { username: true } } },
      },
      clues: true,
      _count: { select: { qrCodes: true } },
    },
  })

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json({ event })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  // Get team userIds before deleting
  const teams = await prisma.team.findMany({ where: { eventId }, select: { id: true, userId: true } })
  const teamIds = teams.map(t => t.id)
  const userIds = teams.map(t => t.userId)

  await prisma.$transaction(async (tx) => {
    await tx.scanHistory.deleteMany({ where: { eventId } })
    await tx.auditLog.deleteMany({ where: { eventId } })
    await tx.teamStageProgress.deleteMany({ where: { eventId } })
    await tx.qrCode.deleteMany({ where: { eventId } })
    await tx.clue.deleteMany({ where: { eventId } })
    if (teamIds.length) await tx.team.deleteMany({ where: { eventId } })
    if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } })
    await tx.event.delete({ where: { id: eventId } })
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Can only edit events in DRAFT status' }, { status: 400 })
  }

  const body = await req.json()
  const { name, description, teamCount, stagesPerTeam, hasCommonFinalQr, startsAt, endsAt } = body

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(teamCount !== undefined && { teamCount }),
      ...(stagesPerTeam !== undefined && { stagesPerTeam }),
      ...(hasCommonFinalQr !== undefined && { hasCommonFinalQr }),
      ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
    },
  })

  return NextResponse.json({ event: updated })
}
