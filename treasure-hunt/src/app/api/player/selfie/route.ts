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

  const team = await prisma.team.findUnique({ where: { id: session!.teamId } })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const selfie = await prisma.selfie.create({
    data: {
      eventId: team.eventId,
      teamId: team.id,
      stageNumber: stageNumber ?? null,
      imageData,
    },
  })

  return NextResponse.json({ ok: true, selfieId: selfie.id })
}
