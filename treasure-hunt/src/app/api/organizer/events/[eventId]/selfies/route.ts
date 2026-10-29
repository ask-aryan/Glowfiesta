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

  const selfies = await prisma.selfie.findMany({
    where: { eventId },
    include: { team: { select: { teamName: true } } },
    orderBy: { takenAt: 'desc' },
  })

  return NextResponse.json({ selfies })
}
