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
      _count: { select: { teams: true, clues: true, qrCodes: true } },
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
