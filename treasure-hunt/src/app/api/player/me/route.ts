import { NextResponse } from 'next/server'
import { requireTeam } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const { session, error } = await requireTeam()
  if (error) return error

  const team = await prisma.team.findUnique({
    where: { id: session!.teamId },
    include: { event: { select: { name: true, status: true } } },
  })

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  return NextResponse.json({
    teamName: team.teamName,
    eventName: team.event.name,
    status: team.status,
    currentStage: team.currentStage,
    eventStatus: team.event.status,
  })
}
