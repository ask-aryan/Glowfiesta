import { prisma } from './db'

export interface DeclaredWinner {
  eventId: number
  teamId: number
  teamName: string
  leaderName: string | null
  members: string | null
  score: number
  declaredAt: number
}

// In-memory cache for fast lookups
const globalWinnerStore = globalThis as unknown as {
  declaredWinners?: Map<number, DeclaredWinner | null>
  winnerTablesReady?: boolean
}

if (!globalWinnerStore.declaredWinners) {
  globalWinnerStore.declaredWinners = new Map<number, DeclaredWinner | null>()
}

const memoryWinners = globalWinnerStore.declaredWinners

async function ensureTable() {
  if (globalWinnerStore.winnerTablesReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_declared_winners (
        event_id INT PRIMARY KEY,
        team_id INT NOT NULL,
        team_name VARCHAR(255) NOT NULL,
        leader_name VARCHAR(255) NULL,
        members TEXT NULL,
        score INT NOT NULL DEFAULT 0,
        declared_at BIGINT NOT NULL
      )
    `)
    globalWinnerStore.winnerTablesReady = true
  } catch (err) {
    console.warn('Notice: event_declared_winners table check:', err)
  }
}

export async function getDeclaredWinner(eventId: number): Promise<DeclaredWinner | null> {
  await ensureTable()

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM event_declared_winners WHERE event_id = ${eventId} LIMIT 1`
    )
    if (rows && rows.length > 0) {
      const r = rows[0]
      const winner: DeclaredWinner = {
        eventId: Number(r.event_id),
        teamId: Number(r.team_id),
        teamName: r.team_name,
        leaderName: r.leader_name || null,
        members: r.members || null,
        score: Number(r.score || 0),
        declaredAt: Number(r.declared_at || Date.now()),
      }
      memoryWinners.set(eventId, winner)
      return winner
    }
    memoryWinners.set(eventId, null)
    return null
  } catch {
    return memoryWinners.get(eventId) || null
  }
}

export async function setDeclaredWinner(eventId: number, teamId: number): Promise<DeclaredWinner | null> {
  await ensureTable()

  // Fetch team details
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, teamName: true, leaderName: true, members: true, score: true },
  })
  if (!team) return null

  const now = Date.now()
  const winner: DeclaredWinner = {
    eventId,
    teamId: team.id,
    teamName: team.teamName,
    leaderName: team.leaderName,
    members: team.members,
    score: team.score,
    declaredAt: now,
  }

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM event_declared_winners WHERE event_id = ${eventId}`
    )
    await prisma.$executeRawUnsafe(
      `INSERT INTO event_declared_winners (event_id, team_id, team_name, leader_name, members, score, declared_at)
       VALUES (${eventId}, ${team.id}, '${team.teamName.replace(/'/g, "''")}', '${(team.leaderName || '').replace(/'/g, "''")}', '${(team.members || '').replace(/'/g, "''")}', ${team.score}, ${now})`
    )
    memoryWinners.set(eventId, winner)
  } catch (err) {
    console.error('Error saving declared winner:', err)
    memoryWinners.set(eventId, winner)
  }

  return winner
}

export async function clearDeclaredWinner(eventId: number): Promise<boolean> {
  await ensureTable()
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM event_declared_winners WHERE event_id = ${eventId}`
    )
    memoryWinners.set(eventId, null)
    return true
  } catch (err) {
    console.error('Error clearing declared winner:', err)
    memoryWinners.set(eventId, null)
    return false
  }
}
