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

  // Fetch all teams in stable creation order
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
    orderBy: { createdAt: 'asc' },
  })

  const allZero = teams.length === 0 || teams.every(t => t.score === 0)

  // Compute ranks treating tied scores equally
  const uniqueScoresDesc = Array.from(new Set(teams.map(t => t.score))).sort((a, b) => b - a)
  const scoreCounts = new Map<number, number>()
  teams.forEach(t => scoreCounts.set(t.score, (scoreCounts.get(t.score) || 0) + 1))

  const teamsWithRank = teams.map((team, idx) => {
    if (allZero) {
      return {
        ...team,
        initialOrder: idx + 1,
        rank: null,
        isTied: false,
        isLeader: false,
      }
    }
    const rank = uniqueScoresDesc.indexOf(team.score) + 1
    const isTied = (scoreCounts.get(team.score) || 1) > 1
    const isLeader = rank === 1 && team.score > 0
    return {
      ...team,
      initialOrder: idx + 1,
      rank,
      isTied,
      isLeader,
    }
  })

  // For live scoreboard presentation: sort by score desc, then createdAt asc
  const scoreboardOrder = [...teamsWithRank].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return NextResponse.json({
    event,
    allZero,
    teams: scoreboardOrder,
    teamsInOrder: teamsWithRank,
  })
}
