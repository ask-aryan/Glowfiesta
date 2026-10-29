import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      gameType: true,
      status: true,
      teamCount: true,
      membersPerTeam: true,
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const teams = await prisma.team.findMany({
    where: { eventId },
    select: {
      id: true,
      teamName: true,
      leaderName: true,
      members: true,
      score: true,
      createdAt: true,
    },
    orderBy: [
      { score: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  // Compute rank with ties
  let currentRank = 1
  const rankedTeams = teams.map((team, idx) => {
    if (idx > 0 && team.score < teams[idx - 1].score) {
      currentRank = idx + 1
    }
    return {
      ...team,
      rank: currentRank,
    }
  })

  return NextResponse.json({
    event,
    teams: rankedTeams,
  })
}
