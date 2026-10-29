import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createTeamSchema } from '@/lib/validation/event'
import bcrypt from 'bcryptjs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const teams = await prisma.team.findMany({
    where: { eventId },
    include: {
      user: { select: { username: true, isActive: true } },
      stageProgress: {
        orderBy: { stageNumber: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ teams })
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
  const parsed = createTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { teamName, username, password } = parsed.data

  // Check username uniqueness
  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
  }

  // Check team name uniqueness per event
  const existingTeam = await prisma.team.findUnique({
    where: { eventId_teamName: { eventId, teamName } },
  })
  if (existingTeam) {
    return NextResponse.json({ error: 'Team name already exists in this event' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, passwordHash, role: 'TEAM' },
    })

    const team = await tx.team.create({
      data: { eventId, userId: user.id, teamName, plainPassword: password },
    })

    // Initialize TeamStageProgress rows for all stages
    const stageProgressData = Array.from({ length: event.stagesPerTeam }, (_, i) => ({
      eventId,
      teamId: team.id,
      stageNumber: i + 1,
      status: 'NOT_STARTED' as const,
    }))

    await tx.teamStageProgress.createMany({ data: stageProgressData })

    return { user, team }
  })

  return NextResponse.json({
    team: {
      id: result.team.id,
      teamName: result.team.teamName,
      username: result.user.username,
      plainPassword: password,
      eventId,
    },
  }, { status: 201 })
}
