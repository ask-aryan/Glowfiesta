import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateScoreSchema } from '@/lib/validation/event'
import { writeAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  const { session, error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  const teamId = parseInt(params.teamId)
  if (isNaN(eventId) || isNaN(teamId)) {
    return NextResponse.json({ error: 'Invalid ID parameters' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = updateScoreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid score payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, eventId: true, teamName: true, score: true },
  })
  if (!team || team.eventId !== eventId) {
    return NextResponse.json({ error: 'Team not found in this event' }, { status: 404 })
  }

  const { delta, score } = parsed.data
  let newScore = team.score
  if (typeof delta === 'number') {
    newScore += delta
  } else if (typeof score === 'number') {
    newScore = score
  }

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: { score: newScore },
  })

  await writeAudit({
    eventId,
    actorUserId: session!.userId!,
    action: 'SCORE_UPDATE',
    entityType: 'Team',
    entityId: teamId,
    reason: `Score for ${team.teamName} changed from ${team.score} to ${newScore} (${typeof delta === 'number' && delta >= 0 ? '+' : ''}${delta ?? ''})`,
  })

  return NextResponse.json({
    team: {
      id: updatedTeam.id,
      teamName: updatedTeam.teamName,
      score: updatedTeam.score,
    },
    delta,
    newScore,
  })
}
