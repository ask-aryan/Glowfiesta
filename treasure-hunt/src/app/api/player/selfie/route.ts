import { NextRequest, NextResponse } from 'next/server'
import { requireTeam } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { session, error } = await requireTeam()
  if (error) return error

  const body = await req.json()
  const { imageData, stageNumber } = body as { imageData: string; stageNumber?: number }

  if (!imageData || !imageData.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }

  const team = await prisma.team.findUnique({
    where: { id: session!.teamId },
    include: {
      stageProgress: {
        orderBy: { stageNumber: 'asc' },
      },
    },
  })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Auto-resolve stage number if not provided by client
  let resolvedStage = stageNumber ?? null
  if (!resolvedStage) {
    const activeStage = team.stageProgress.find(
      p => p.status !== 'COMPLETED' && p.status !== 'NEXT_CLUE_RELEASED'
    )
    resolvedStage = activeStage ? activeStage.stageNumber : null
  }

  const selfie = await prisma.selfie.create({
    data: {
      eventId: team.eventId,
      teamId: team.id,
      stageNumber: resolvedStage,
      imageData,
    },
  })

  return NextResponse.json({ ok: true, selfieId: selfie.id })
}
