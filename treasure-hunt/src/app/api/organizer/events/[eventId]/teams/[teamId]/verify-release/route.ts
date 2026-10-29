import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAudit } from '@/lib/audit'
import { verifyReleaseSchema } from '@/lib/validation/event'

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

  const body = await req.json()
  const parsed = verifyReleaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { reportedCode, stageNumber } = parsed.data

  const progress = await prisma.teamStageProgress.findFirst({
    where: { teamId, stageNumber, status: 'AWAITING_RECEPTION_VERIFICATION' },
  })
  if (!progress) {
    return NextResponse.json({ error: 'No pending verification for this team/stage' }, { status: 400 })
  }

  // Find the clue for this team + stage — it holds the resultCode
  const clue = await prisma.clue.findFirst({
    where: { eventId, teamId, stageNumber },
  })
  if (!clue) {
    return NextResponse.json({ error: 'Clue not found for this team/stage' }, { status: 400 })
  }

  if (clue.resultCode.toUpperCase() !== reportedCode.toUpperCase()) {
    return NextResponse.json({ error: 'Code does not match — check again' }, { status: 400 })
  }

  await prisma.teamStageProgress.update({
    where: { id: progress.id },
    data: {
      status: 'NEXT_CLUE_RELEASED',
      verifiedBy: session!.userId!,
      verifiedAt: new Date(),
      nextClueReleasedAt: new Date(),
    },
  })

  await writeAudit({
    eventId,
    actorUserId: session!.userId!,
    action: 'VERIFY_AND_RELEASE',
    entityType: 'TeamStageProgress',
    entityId: progress.id,
    reason: `Verified stage ${stageNumber} for team ${teamId} with code ${reportedCode}`,
  })

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  const isLastStage = event ? stageNumber >= event.stagesPerTeam : false

  return NextResponse.json({ ok: true, nextStage: stageNumber + 1, isLastStage })
}
