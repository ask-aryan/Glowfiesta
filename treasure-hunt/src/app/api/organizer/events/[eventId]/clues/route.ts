import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createClueSchema } from '@/lib/validation/event'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function generateUniqueCode(eventId: number): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join('')
    const existing = await prisma.clue.findFirst({ where: { eventId, resultCode: code } })
    if (!existing) return code
  }
  throw new Error('Could not generate unique result code')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const clues = await prisma.clue.findMany({
    where: { eventId },
    include: { team: { select: { id: true, teamName: true } } },
    orderBy: [{ isCommonFinal: 'asc' }, { stageNumber: 'asc' }, { teamId: 'asc' }],
  })

  return NextResponse.json({ clues })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createClueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { teamId, stageNumber, clueText, hintText, isCommonFinal } = parsed.data

  if (isCommonFinal) {
    const existing = await prisma.clue.findFirst({ where: { eventId, isCommonFinal: true } })
    if (existing) return NextResponse.json({ error: 'A common final clue already exists' }, { status: 400 })
  } else {
    if (!stageNumber) return NextResponse.json({ error: 'stageNumber required for stage clues' }, { status: 400 })
    if (!teamId) return NextResponse.json({ error: 'teamId required for stage clues' }, { status: 400 })
    const existing = await prisma.clue.findFirst({ where: { eventId, teamId, stageNumber } })
    if (existing) return NextResponse.json({ error: 'Clue already exists for this team and stage' }, { status: 400 })
  }

  const resultCode = await generateUniqueCode(eventId)

  const clue = await prisma.clue.create({
    data: {
      eventId,
      teamId: isCommonFinal ? null : (teamId ?? null),
      stageNumber: isCommonFinal ? null : stageNumber,
      clueText,
      hintText,
      resultCode,
      isCommonFinal,
    },
    include: { team: { select: { id: true, teamName: true } } },
  })

  return NextResponse.json({ clue }, { status: 201 })
}
