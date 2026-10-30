import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEventSchema } from '@/lib/validation/event'

export async function GET() {
  const { session, error } = await requireOrganizer()
  if (error) return error

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { teams: true, clues: true, qrCodes: true } },
    },
  })

  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireOrganizer()
  if (error) return error

  const body = await req.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, gameType, teamCount, stagesPerTeam, membersPerTeam, hasCommonFinalQr, maxHintsPerTeam, hintDelayMinutes, startsAt, endsAt } = parsed.data

  const event = await prisma.event.create({
    data: {
      name,
      description,
      gameType: gameType ?? 'TREASURE_HUNT',
      teamCount,
      stagesPerTeam: stagesPerTeam ?? (gameType === 'TREASURE_HUNT' ? 5 : 0),
      membersPerTeam: membersPerTeam ?? 4,
      hasCommonFinalQr: gameType === 'TREASURE_HUNT' ? (hasCommonFinalQr ?? true) : false,
      maxHintsPerTeam: maxHintsPerTeam ?? 2,
      hintDelayMinutes: hintDelayMinutes ?? 5,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdBy: session!.userId!,
    },
  })

  return NextResponse.json({ event }, { status: 201 })
}
