import { prisma } from './db'

export type BuzzerStatus = 'DRAFT' | 'READY' | 'LIVE'

export interface BuzzerPress {
  id: string
  roomCode: string
  roundNumber: number
  teamName: string
  buzzedAtMs: number
  deltaMs: number
  rank?: number
}

export interface BuzzerParticipant {
  id: string
  roomCode: string
  teamName: string
  joinedAt: number
  lastSeenAt: number
}

export interface BuzzerRoom {
  id: string // roomCode e.g. "GF-8291"
  name: string
  hostKey: string
  status: BuzzerStatus
  roundNumber: number
  liveAt: number | null
  firstBuzzAt: number | null
  createdAt: number
  updatedAt: number
  participants: Map<string, BuzzerParticipant>
  presses: BuzzerPress[]
}

// In-memory store for fallback and sub-millisecond fast lookups
const globalBuzzerStore = globalThis as unknown as {
  buzzerRooms?: Map<string, BuzzerRoom>
  buzzerTablesInitialized?: boolean
}

if (!globalBuzzerStore.buzzerRooms) {
  globalBuzzerStore.buzzerRooms = new Map<string, BuzzerRoom>()
}

const rooms = globalBuzzerStore.buzzerRooms

// Ensure DB tables exist for persistence across server restarts / lambdas
async function ensureTables() {
  if (globalBuzzerStore.buzzerTablesInitialized) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS buzzer_rooms (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        host_key VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        round_number INT NOT NULL DEFAULT 1,
        live_at BIGINT NULL,
        first_buzz_at BIGINT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS buzzer_participants (
        id VARCHAR(120) PRIMARY KEY,
        room_code VARCHAR(50) NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        joined_at BIGINT NOT NULL,
        last_seen_at BIGINT NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS buzzer_presses (
        id VARCHAR(120) PRIMARY KEY,
        room_code VARCHAR(50) NOT NULL,
        round_number INT NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        buzzed_at_ms BIGINT NOT NULL,
        delta_ms BIGINT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL
      )
    `)
    globalBuzzerStore.buzzerTablesInitialized = true
  } catch (err) {
    console.warn('Notice: buzzer tables check completed or deferred:', err)
  }
}

// Generate friendly 6-char room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate host management key
function generateHostKey(): string {
  return 'hk_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
}

export async function createBuzzerRoom(name?: string): Promise<BuzzerRoom> {

  await ensureTables()
  let code = generateRoomCode()
  while (rooms.has(code)) {
    code = generateRoomCode()
  }

  const now = Date.now()
  const roomName = (name || '').trim() || `Diwali Party ${code}`
  const hostKey = generateHostKey()

  const room: BuzzerRoom = {
    id: code,
    name: roomName,
    hostKey,
    status: 'DRAFT',
    roundNumber: 1,
    liveAt: null,
    firstBuzzAt: null,
    createdAt: now,
    updatedAt: now,
    participants: new Map(),
    presses: [],
  }

  rooms.set(code, room)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO buzzer_rooms (id, name, host_key, status, round_number, live_at, first_buzz_at, created_at, updated_at)
       VALUES ('${code}', '${roomName.replace(/'/g, "''")}', '${hostKey}', 'DRAFT', 1, NULL, NULL, ${now}, ${now})`
    )
  } catch (e) {
    console.warn('DB persistence fallback:', e)
  }

  return room
}

export async function getRoom(roomCode: string): Promise<BuzzerRoom | null> {
  const code = roomCode.toUpperCase().trim()
  if (!code) return null

  await ensureTables()

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM buzzer_rooms WHERE id = '${code.replace(/'/g, "''")}' LIMIT 1`
    )
    if (rows && rows.length > 0) {
      const r = rows[0]
      const roundNumber = Number(r.round_number || 1)
      const dbRoom: BuzzerRoom = {
        id: r.id,
        name: r.name,
        hostKey: r.host_key,
        status: (r.status as BuzzerStatus) || 'DRAFT',
        roundNumber,
        liveAt: r.live_at ? Number(r.live_at) : null,
        firstBuzzAt: r.first_buzz_at ? Number(r.first_buzz_at) : null,
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now()),
        participants: new Map(),
        presses: [],
      }

      // Load participants
      const parts = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM buzzer_participants WHERE room_code = '${code.replace(/'/g, "''")}'`
      )
      for (const p of parts || []) {
        dbRoom.participants.set(p.team_name.toLowerCase(), {
          id: p.id,
          roomCode: p.room_code,
          teamName: p.team_name,
          joinedAt: Number(p.joined_at),
          lastSeenAt: Number(p.last_seen_at),
        })
      }

      // Load current round presses
      const presses = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM buzzer_presses WHERE room_code = '${code.replace(/'/g, "''")}' AND round_number = ${roundNumber} ORDER BY buzzed_at_ms ASC`
      )
      dbRoom.presses = (presses || []).map((pr, idx) => ({
        id: pr.id,
        roomCode: pr.room_code,
        roundNumber: Number(pr.round_number),
        teamName: pr.team_name,
        buzzedAtMs: Number(pr.buzzed_at_ms),
        deltaMs: Number(pr.delta_ms),
        rank: idx + 1,
      }))

      // Guard against stale DB reads regressing memory state
      const memRoom = rooms.get(code)
      if (memRoom && memRoom.updatedAt > dbRoom.updatedAt) {
        dbRoom.status = memRoom.status
        dbRoom.roundNumber = memRoom.roundNumber
        dbRoom.liveAt = memRoom.liveAt
        dbRoom.firstBuzzAt = memRoom.firstBuzzAt
        dbRoom.updatedAt = memRoom.updatedAt
        if (memRoom.presses.length > dbRoom.presses.length) {
          dbRoom.presses = memRoom.presses
        }
      }

      rooms.set(code, dbRoom)
      return dbRoom
    }
  } catch (err) {
    console.warn('Error loading buzzer room from DB:', err)
  }

  // Fallback to in-memory store
  if (rooms.has(code)) {
    return rooms.get(code)!
  }

  return null
}

export async function joinParticipant(roomCode: string, teamName: string): Promise<BuzzerParticipant | null> {
  const room = await getRoom(roomCode)
  if (!room) return null

  const cleanName = teamName.trim()
  if (!cleanName) return null

  const key = cleanName.toLowerCase()
  const now = Date.now()
  let participant = room.participants.get(key)
  const partId = `${room.id}_${key}`

  if (participant) {
    participant.lastSeenAt = now
  } else {
    participant = {
      id: partId,
      roomCode: room.id,
      teamName: cleanName,
      joinedAt: now,
      lastSeenAt: now,
    }
    room.participants.set(key, participant)
  }

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO buzzer_participants (id, room_code, team_name, joined_at, last_seen_at)
       VALUES ('${partId.replace(/'/g, "''")}', '${room.id}', '${cleanName.replace(/'/g, "''")}', ${now}, ${now})
       ON CONFLICT (id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`
    ).catch(async () => {
      await prisma.$executeRawUnsafe(
        `INSERT INTO buzzer_participants (id, room_code, team_name, joined_at, last_seen_at)
         VALUES ('${partId.replace(/'/g, "''")}', '${room.id}', '${cleanName.replace(/'/g, "''")}', ${now}, ${now})
         ON DUPLICATE KEY UPDATE last_seen_at = VALUES(last_seen_at)`
      )
    })
  } catch (err) {
    console.warn('Notice: joinParticipant DB write:', err)
  }

  return participant
}

export async function updateRoomStatus(
  roomCode: string,
  hostKey: string,
  status: BuzzerStatus
): Promise<BuzzerRoom | null> {
  const room = await getRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null

  room.status = status
  room.updatedAt = Date.now()
  if (status === 'LIVE') {
    room.liveAt = Date.now()
  } else {
    room.liveAt = null
    room.firstBuzzAt = null
  }

  rooms.set(room.id, room)

  try {
    const liveAtSql = room.liveAt ? `${room.liveAt}` : 'NULL'
    const firstBuzzSql = room.firstBuzzAt ? `${room.firstBuzzAt}` : 'NULL'
    await prisma.$executeRawUnsafe(
      `UPDATE buzzer_rooms SET status = '${status}', live_at = ${liveAtSql}, first_buzz_at = ${firstBuzzSql}, updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
  } catch (err) {
    console.warn('Notice: updateRoomStatus DB write:', err)
  }

  return room
}

export async function recordBuzzerPress(
  roomCode: string,
  teamName: string,
  clientTimeMs?: number
): Promise<{ success: boolean; press?: BuzzerPress; message?: string; alreadyBuzzed?: boolean; rank?: number }> {
  const room = await getRoom(roomCode)
  if (!room) return { success: false, message: 'Room not found' }

  if (room.status !== 'LIVE') {
    return {
      success: false,
      message: room.status === 'READY' ? 'Wait for LIVE! Buzzer is not active yet.' : 'Room is in DRAFT stage.',
    }
  }

  const cleanName = teamName.trim()
  if (!cleanName) return { success: false, message: 'Team name is required' }

  // Check if team has already buzzed in this round
  const existing = room.presses.find(p => p.teamName.toLowerCase() === cleanName.toLowerCase())
  if (existing) {
    return {
      success: true,
      alreadyBuzzed: true,
      press: existing,
      rank: existing.rank,
      message: 'Already buzzed in this round!',
    }
  }

  const now = Date.now()
  let deltaMs = 0

  if (room.presses.length === 0) {
    // First buzz in this round!
    room.firstBuzzAt = now
    deltaMs = 0
  } else {
    const base = room.firstBuzzAt || room.liveAt || now
    deltaMs = Math.max(0, now - base)
  }

  const rank = room.presses.length + 1
  const pressId = `${room.id}_r${room.roundNumber}_${cleanName.toLowerCase()}`
  const press: BuzzerPress = {
    id: pressId,
    roomCode: room.id,
    roundNumber: room.roundNumber,
    teamName: cleanName,
    buzzedAtMs: now,
    deltaMs,
    rank,
  }

  room.presses.push(press)
  room.updatedAt = now

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO buzzer_presses (id, room_code, round_number, team_name, buzzed_at_ms, delta_ms, created_at)
       VALUES ('${pressId.replace(/'/g, "''")}', '${room.id}', ${room.roundNumber}, '${cleanName.replace(/'/g, "''")}', ${now}, ${deltaMs}, ${now})`
    )

    if (rank === 1) {
      await prisma.$executeRawUnsafe(
        `UPDATE buzzer_rooms SET first_buzz_at = ${now}, updated_at = ${now} WHERE id = '${room.id}'`
      )
    }
  } catch (err) {
    console.warn('Notice: recordBuzzerPress DB write:', err)
  }

  return {
    success: true,
    press,
    rank,
  }
}

export async function resetRoomBuzzers(
  roomCode: string,
  hostKey: string,
  nextStatus: BuzzerStatus = 'READY'
): Promise<BuzzerRoom | null> {
  const room = await getRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null

  const now = Date.now()
  room.presses = []
  room.firstBuzzAt = null
  room.roundNumber += 1
  room.status = nextStatus
  room.liveAt = nextStatus === 'LIVE' ? now : null
  room.updatedAt = now

  rooms.set(room.id, room)

  try {
    const liveAtSql = room.liveAt ? `${room.liveAt}` : 'NULL'
    await prisma.$executeRawUnsafe(
      `UPDATE buzzer_rooms SET round_number = ${room.roundNumber}, status = '${nextStatus}', live_at = ${liveAtSql}, first_buzz_at = NULL, updated_at = ${now} WHERE id = '${room.id}'`
    )
  } catch (err) {
    console.warn('Notice: resetRoomBuzzers DB write:', err)
  }

  return room
}

export const createRoom = createBuzzerRoom
export const recordBuzz = recordBuzzerPress

