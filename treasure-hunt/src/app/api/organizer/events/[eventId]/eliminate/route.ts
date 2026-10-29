import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { session, error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, gameType: true, currentRound: true, status: true },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.gameType !== 'QUIZ' && event.gameType !== 'FUNTAKSHARI') {
    return NextResponse.json({ error: 'Elimination is only available for Quiz and Funtakshari events' }, { status: 400 })
  }

  const body = await req.json()
  const { action, count, teamIds, teamId } = body as {
    action: 'eliminate' | 'revive' | 'revert_round'
    count?: number
    teamIds?: number[]
    teamId?: number
  }

  if (action === 'eliminate') {
    // Get current active (alive) teams sorted bottom-up (lowest score first)
    const activeTeams = await prisma.team.findMany({
      where: { eventId, isEliminated: false },
      select: { id: true, teamName: true, score: true, createdAt: true },
      orderBy: [{ score: 'asc' }, { createdAt: 'desc' }],
    })

    const activeCount = activeTeams.length
    const maxAllowedToEliminate = Math.max(0, activeCount - 2)

    if (activeCount <= 2) {
      return NextResponse.json({
        error: `Cannot eliminate teams. Only ${activeCount} active teams remain (minimum 2 teams required to compete).`,
      }, { status: 400 })
    }

    let finalTeamIds: number[] = []

    if (typeof count === 'number') {
      if (count < 1 || count > maxAllowedToEliminate) {
        return NextResponse.json({
          error: `Cannot eliminate ${count} teams. With ${activeCount} active teams, you can eliminate between 1 and ${maxAllowedToEliminate} teams (< n-1).`,
        }, { status: 400 })
      }
      finalTeamIds = activeTeams.slice(0, count).map(t => t.id)
    } else if (Array.isArray(teamIds) && teamIds.length > 0) {
      if (teamIds.length > maxAllowedToEliminate) {
        return NextResponse.json({
          error: `Cannot eliminate ${teamIds.length} teams. With ${activeCount} active teams, you can eliminate at most ${maxAllowedToEliminate} team${maxAllowedToEliminate > 1 ? 's' : ''} (< n-1).`,
        }, { status: 400 })
      }
      const activeTeamIdSet = new Set(activeTeams.map(t => t.id))
      for (const id of teamIds) {
        if (!activeTeamIdSet.has(id)) {
          return NextResponse.json({ error: `Team ID ${id} is not an active team in this event` }, { status: 400 })
        }
      }
      finalTeamIds = teamIds
    } else {
      return NextResponse.json({ error: 'Please specify the number of bottom teams to eliminate' }, { status: 400 })
    }

    const eliminateCount = finalTeamIds.length
    const currentRound = event.currentRound || 1

    // Mark bottom teams as eliminated with their round
    await prisma.team.updateMany({
      where: { id: { in: finalTeamIds }, eventId },
      data: { isEliminated: true, eliminatedRound: currentRound },
    })

    // Advance to next round
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { currentRound: { increment: 1 } },
      select: { currentRound: true },
    })

    await writeAudit({
      eventId,
      actorUserId: session!.userId!,
      action: 'ELIMINATE_TEAMS',
      entityType: 'Event',
      entityId: eventId,
      reason: `Eliminated ${eliminateCount} team(s) in Round ${currentRound}. Advanced to Round ${updatedEvent.currentRound}.`,
    })

    return NextResponse.json({
      success: true,
      eliminatedCount: eliminateCount,
      previousRound: currentRound,
      currentRound: updatedEvent.currentRound,
    })
  }

  if (action === 'revive') {
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required to revive' }, { status: 400 })
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, eventId: true, teamName: true, isEliminated: true },
    })

    if (!team || team.eventId !== eventId) {
      return NextResponse.json({ error: 'Team not found in this event' }, { status: 404 })
    }

    if (!team.isEliminated) {
      return NextResponse.json({ error: 'Team is already active' }, { status: 400 })
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isEliminated: false, eliminatedRound: null },
    })

    await writeAudit({
      eventId,
      actorUserId: session!.userId!,
      action: 'REVIVE_TEAM',
      entityType: 'Team',
      entityId: teamId,
      reason: `Restored team '${team.teamName}' back to active alive pool`,
    })

    return NextResponse.json({
      success: true,
      revivedTeamId: teamId,
      teamName: team.teamName,
    })
  }

  if (action === 'revert_round') {
    const currentRound = event.currentRound || 1
    if (currentRound <= 1) {
      return NextResponse.json({ error: 'Already at Round 1 — no previous rounds to revert' }, { status: 400 })
    }

    const prevRound = currentRound - 1

    // Revive teams eliminated in the previous round
    const restored = await prisma.team.updateMany({
      where: { eventId, eliminatedRound: prevRound },
      data: { isEliminated: false, eliminatedRound: null },
    })

    // Roll back event round
    await prisma.event.update({
      where: { id: eventId },
      data: { currentRound: prevRound },
    })

    await writeAudit({
      eventId,
      actorUserId: session!.userId!,
      action: 'REVERT_ROUND',
      entityType: 'Event',
      entityId: eventId,
      reason: `Reverted Round ${currentRound} back to Round ${prevRound}, restoring ${restored.count} team(s)`,
    })

    return NextResponse.json({
      success: true,
      restoredCount: restored.count,
      currentRound: prevRound,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
