import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
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
    return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const stageNumber = parseInt(body.stageNumber)
  if (isNaN(stageNumber)) {
    return NextResponse.json({ error: 'Valid stageNumber is required' }, { status: 400 })
  }

  const progress = await prisma.teamStageProgress.findFirst({
    where: {
      teamId,
      stageNumber,
      usedHint: true,
    },
  })

  if (!progress) {
    return NextResponse.json({ error: 'No active hint request found for this team and stage' }, { status: 404 })
  }

  const now = new Date()
  await prisma.teamStageProgress.update({
    where: { id: progress.id },
    data: {
      hintResolvedAt: now,
      hintResolvedBy: session!.userId!,
    },
  })

  await writeAudit({
    eventId,
    actorUserId: session!.userId!,
    action: 'HINT_RESOLVED',
    entityType: 'TeamStageProgress',
    entityId: progress.id,
    reason: `Organizer marked hint as given for team ${teamId} on Stage ${stageNumber}`,
  })

  return NextResponse.json({ ok: true, stageNumber, hintResolvedAt: now })
}
