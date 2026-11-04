import { prisma } from './db'

export type DecorationStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED'

export interface DecorationTeam {
  id: string
  teamNumber: number
  name: string
  description?: string
  photoUrl?: string | null
  orderIndex: number
  totalScore: number
  averageScore: number
  ballotsCount: number
  criteriaBreakdown: Record<string, { average: number; total: number }>
}

export interface DecorationCriteria {
  id: string
  name: string
  description?: string
  maxScore: number
  orderIndex: number
}

export interface DecorationEventState {
  id: string
  title: string
  status: DecorationStatus
  totalBallots: number
  teams: DecorationTeam[]
  criteria: DecorationCriteria[]
  updatedAt: number
}

const GLOBAL_DECORATION_KEY = 'DECORATION_EVENT_MAIN'

const globalDecorationStore = globalThis as unknown as {
  decorationCache?: DecorationEventState | null
  decorationTablesReady?: boolean
}

const DEFAULT_CRITERIA: DecorationCriteria[] = [
  { id: 'crit_theme', name: 'Creativity & Theme 🎨', description: 'Originality, storytelling and theme execution', maxScore: 10, orderIndex: 0 },
  { id: 'crit_lighting', name: 'Lighting & Diwali Glow 🪔', description: 'Illumination, diyas, fairy lights & warm ambience', maxScore: 10, orderIndex: 1 },
  { id: 'crit_ecofriendly', name: 'Eco-Friendly & Craftsmanship 🌿', description: 'Handcrafted items, sustainable materials & detail', maxScore: 10, orderIndex: 2 },
  { id: 'crit_ambience', name: 'Overall Presentation & Vibe ✨', description: 'Desk neatness, team energy and festive feel', maxScore: 10, orderIndex: 3 },
]

const DEFAULT_TEAMS: Omit<DecorationTeam, 'totalScore' | 'averageScore' | 'ballotsCount' | 'criteriaBreakdown'>[] = [
  { id: 'team_dec_1', teamNumber: 1, name: 'Team 1: Cyber Diwali', description: 'Counter #1 • East Wing', photoUrl: null, orderIndex: 0 },
  { id: 'team_dec_2', teamNumber: 2, name: 'Team 2: Traditional Glow', description: 'Counter #2 • Central Hub', photoUrl: null, orderIndex: 1 },
  { id: 'team_dec_3', teamNumber: 3, name: 'Team 3: Eco Lanterns', description: 'Counter #3 • North Bay', photoUrl: null, orderIndex: 2 },
  { id: 'team_dec_4', teamNumber: 4, name: 'Team 4: Royal Heritage', description: 'Counter #4 • South Corridor', photoUrl: null, orderIndex: 3 },
]

async function ensureTables() {
  if (globalDecorationStore.decorationTablesReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS decoration_state (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        updated_at BIGINT NOT NULL
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS decoration_teams (
        id VARCHAR(100) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        team_number INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        photo_url TEXT NULL,
        order_index INT NOT NULL DEFAULT 0
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS decoration_criteria (
        id VARCHAR(100) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        max_score INT NOT NULL DEFAULT 10,
        order_index INT NOT NULL DEFAULT 0
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS decoration_ballots (
        id VARCHAR(150) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        voter_hash VARCHAR(150) NOT NULL,
        voted_at BIGINT NOT NULL
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS decoration_scores (
        id VARCHAR(150) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        voter_hash VARCHAR(150) NOT NULL,
        team_id VARCHAR(100) NOT NULL,
        criteria_id VARCHAR(100) NOT NULL,
        score INT NOT NULL,
        voted_at BIGINT NOT NULL
      )
    `)

    globalDecorationStore.decorationTablesReady = true
  } catch (err) {
    console.warn('Notice: Decoration Event tables check:', err)
  }
}

export async function getDecorationEvent(): Promise<DecorationEventState> {
  await ensureTables()
  const now = Date.now()

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_state WHERE id = '${GLOBAL_DECORATION_KEY}' LIMIT 1`
    )

    if (!rows || rows.length === 0) {
      // Seed initial decoration event with default 4 teams and 4 criteria
      await prisma.$executeRawUnsafe(
        `INSERT INTO decoration_state (id, title, status, updated_at)
         VALUES ('${GLOBAL_DECORATION_KEY}', 'Diwali Bay & Desk Decoration Contest 2026', 'ACTIVE', ${now})`
      )

      for (const t of DEFAULT_TEAMS) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO decoration_teams (id, event_id, team_number, name, description, photo_url, order_index)
           VALUES ('${t.id}', '${GLOBAL_DECORATION_KEY}', ${t.teamNumber}, '${t.name.replace(/'/g, "''")}', '${(t.description || '').replace(/'/g, "''")}', NULL, ${t.orderIndex})`
        )
      }

      for (const c of DEFAULT_CRITERIA) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO decoration_criteria (id, event_id, name, description, max_score, order_index)
           VALUES ('${c.id}', '${GLOBAL_DECORATION_KEY}', '${c.name.replace(/'/g, "''")}', '${(c.description || '').replace(/'/g, "''")}', ${c.maxScore}, ${c.orderIndex})`
        )
      }
    }

    const stateRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_state WHERE id = '${GLOBAL_DECORATION_KEY}' LIMIT 1`
    )
    const stateRow = stateRows[0] || {}
    const title = stateRow.title || 'Diwali Bay & Desk Decoration Contest 2026'
    const status = (stateRow.status as DecorationStatus) || 'ACTIVE'
    const updatedAt = Number(stateRow.updated_at || now)

    // Load criteria
    const critRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_criteria WHERE event_id = '${GLOBAL_DECORATION_KEY}' ORDER BY order_index ASC`
    )
    const criteria: DecorationCriteria[] = (critRows || []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      maxScore: Number(r.max_score ?? 10),
      orderIndex: Number(r.order_index ?? 0),
    }))

    // Load teams
    const teamRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_teams WHERE event_id = '${GLOBAL_DECORATION_KEY}' ORDER BY team_number ASC, order_index ASC`
    )

    // Load scores and ballots
    const ballotRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_ballots WHERE event_id = '${GLOBAL_DECORATION_KEY}'`
    )
    const scoreRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM decoration_scores WHERE event_id = '${GLOBAL_DECORATION_KEY}'`
    )

    // Tally scores per team & criteria
    // teamId -> { total: number, count: number, criteria: { [critId]: { total, count } } }
    const teamStats = new Map<string, {
      totalScore: number
      voterHashes: Set<string>
      criteria: Map<string, { total: number; count: number }>
    }>()

    for (const s of scoreRows || []) {
      const tId = s.team_id
      const cId = s.criteria_id
      const val = Number(s.score || 0)
      const vHash = s.voter_hash

      if (!teamStats.has(tId)) {
        teamStats.set(tId, { totalScore: 0, voterHashes: new Set(), criteria: new Map() })
      }
      const st = teamStats.get(tId)!
      st.totalScore += val
      if (vHash) st.voterHashes.add(vHash)

      if (!st.criteria.has(cId)) {
        st.criteria.set(cId, { total: 0, count: 0 })
      }
      const cSt = st.criteria.get(cId)!
      cSt.total += val
      cSt.count += 1
    }

    const teams: DecorationTeam[] = (teamRows || []).map(t => {
      const st = teamStats.get(t.id)
      const ballotsCount = st ? st.voterHashes.size : 0
      const totalScore = st ? st.totalScore : 0

      // Calculate criteria breakdown
      const criteriaBreakdown: Record<string, { average: number; total: number }> = {}
      criteria.forEach(c => {
        const cStat = st?.criteria.get(c.id)
        const avg = cStat && cStat.count > 0 ? Number((cStat.total / cStat.count).toFixed(1)) : 0
        criteriaBreakdown[c.id] = {
          average: avg,
          total: cStat ? cStat.total : 0,
        }
      })

      const averageScore = ballotsCount > 0 ? Number((totalScore / ballotsCount).toFixed(1)) : 0

      return {
        id: t.id,
        teamNumber: Number(t.team_number ?? 1),
        name: t.name,
        description: t.description || undefined,
        photoUrl: t.photo_url || null,
        orderIndex: Number(t.order_index ?? 0),
        totalScore,
        averageScore,
        ballotsCount,
        criteriaBreakdown,
      }
    })

    const state: DecorationEventState = {
      id: GLOBAL_DECORATION_KEY,
      title,
      status,
      totalBallots: (ballotRows || []).length,
      teams,
      criteria,
      updatedAt,
    }

    globalDecorationStore.decorationCache = state
    return state
  } catch (err) {
    console.error('Error fetching Decoration Event:', err)
    if (globalDecorationStore.decorationCache) return globalDecorationStore.decorationCache
    return {
      id: GLOBAL_DECORATION_KEY,
      title: 'Diwali Bay & Desk Decoration Contest 2026',
      status: 'ACTIVE',
      totalBallots: 0,
      teams: [],
      criteria: DEFAULT_CRITERIA,
      updatedAt: Date.now(),
    }
  }
}

export async function setDecorationStatus(status: DecorationStatus): Promise<DecorationEventState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE decoration_state SET status = '${status}', updated_at = ${now} WHERE id = '${GLOBAL_DECORATION_KEY}'`
    )
  } catch (err) {
    console.error('Error updating decoration status:', err)
  }

  return await getDecorationEvent()
}

export async function saveDecorationSetup(payload: {
  title?: string
  teams: Array<{
    id?: string
    teamNumber: number
    name: string
    description?: string
    photoUrl?: string | null
    orderIndex: number
  }>
  criteria: Array<{
    id?: string
    name: string
    description?: string
    maxScore: number
    orderIndex: number
  }>
}): Promise<DecorationEventState> {
  await ensureTables()
  const now = Date.now()
  const { title, teams, criteria } = payload

  try {
    if (title) {
      await prisma.$executeRawUnsafe(
        `UPDATE decoration_state SET title = '${title.replace(/'/g, "''")}', updated_at = ${now} WHERE id = '${GLOBAL_DECORATION_KEY}'`
      )
    }

    // Save Teams
    await prisma.$executeRawUnsafe(`DELETE FROM decoration_teams WHERE event_id = '${GLOBAL_DECORATION_KEY}'`)
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i]
      const teamId = t.id || `team_dec_${Date.now()}_${i}`
      const photoEscaped = t.photoUrl ? `'${t.photoUrl.replace(/'/g, "''")}'` : 'NULL'
      await prisma.$executeRawUnsafe(
        `INSERT INTO decoration_teams (id, event_id, team_number, name, description, photo_url, order_index)
         VALUES ('${teamId}', '${GLOBAL_DECORATION_KEY}', ${t.teamNumber || i + 1}, '${t.name.replace(/'/g, "''")}', '${(t.description || '').replace(/'/g, "''")}', ${photoEscaped}, ${i})`
      )
    }

    // Save Criteria
    await prisma.$executeRawUnsafe(`DELETE FROM decoration_criteria WHERE event_id = '${GLOBAL_DECORATION_KEY}'`)
    for (let j = 0; j < criteria.length; j++) {
      const c = criteria[j]
      const critId = c.id || `crit_${Date.now()}_${j}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO decoration_criteria (id, event_id, name, description, max_score, order_index)
         VALUES ('${critId}', '${GLOBAL_DECORATION_KEY}', '${c.name.replace(/'/g, "''")}', '${(c.description || '').replace(/'/g, "''")}', ${c.maxScore || 10}, ${j})`
      )
    }

    await prisma.$executeRawUnsafe(
      `UPDATE decoration_state SET updated_at = ${now} WHERE id = '${GLOBAL_DECORATION_KEY}'`
    )
  } catch (err) {
    console.error('Error saving decoration setup:', err)
  }

  return await getDecorationEvent()
}

export async function submitDecorationBallot(payload: {
  voterHash: string
  scores: Record<string, Record<string, number>> // { [teamId]: { [criteriaId]: score } }
}): Promise<{ success: boolean; message: string }> {
  await ensureTables()
  const event = await getDecorationEvent()

  if (event.status === 'STOPPED') {
    return { success: false, message: 'Decoration voting is currently closed by the organizer.' }
  }
  if (event.status === 'PAUSED') {
    return { success: false, message: 'Voting is temporarily paused. Please hold on!' }
  }

  const { voterHash, scores } = payload
  if (!voterHash || !scores || typeof scores !== 'object') {
    return { success: false, message: 'Invalid ballot submission payload.' }
  }

  // Requirement check: "on the submition that team will have a number audiance have to vote for all the teams"
  // Verify that all configured teams have scores submitted
  const missingTeams = event.teams.filter(t => !scores[t.id] || Object.keys(scores[t.id]).length === 0)
  if (missingTeams.length > 0) {
    return {
      success: false,
      message: `Please score all ${event.teams.length} teams before submitting. Missing: ${missingTeams.map(m => `Team #${m.teamNumber}`).join(', ')}.`,
    }
  }

  const now = Date.now()
  const cleanHash = voterHash.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `anon_${Math.random().toString(36).substring(2, 10)}`

  try {
    // 1 Vote per device: check if device already voted
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM decoration_ballots WHERE event_id = '${GLOBAL_DECORATION_KEY}' AND voter_hash = '${cleanHash}' LIMIT 1`
    )

    if (existing && existing.length > 0) {
      return {
        success: false,
        message: 'You have already submitted your decoration scores from this device.',
      }
    }

    // Insert ballot
    const ballotId = `dec_b_${cleanHash}_${Date.now().toString(36)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO decoration_ballots (id, event_id, voter_hash, voted_at)
       VALUES ('${ballotId}', '${GLOBAL_DECORATION_KEY}', '${cleanHash}', ${now})`
    )

    // Insert scores
    for (const [teamId, teamScores] of Object.entries(scores)) {
      for (const [criteriaId, scoreVal] of Object.entries(teamScores)) {
        const scoreId = `score_${cleanHash}_${teamId.slice(-6)}_${criteriaId.slice(-6)}_${Date.now().toString(36)}`
        await prisma.$executeRawUnsafe(
          `INSERT INTO decoration_scores (id, event_id, voter_hash, team_id, criteria_id, score, voted_at)
           VALUES ('${scoreId}', '${GLOBAL_DECORATION_KEY}', '${cleanHash}', '${teamId.replace(/'/g, "''")}', '${criteriaId.replace(/'/g, "''")}', ${Number(scoreVal || 0)}, ${now})`
        )
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE decoration_state SET updated_at = ${now} WHERE id = '${GLOBAL_DECORATION_KEY}'`
    )

    return {
      success: true,
      message: 'Your decoration scores for all teams have been successfully recorded! Thank you!',
    }
  } catch (err) {
    console.error('Error recording decoration ballot:', err)
    return { success: false, message: 'Failed to record scores. Please try again.' }
  }
}

export async function resetDecorationVotes(): Promise<DecorationEventState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM decoration_scores WHERE event_id = '${GLOBAL_DECORATION_KEY}'`)
    await prisma.$executeRawUnsafe(`DELETE FROM decoration_ballots WHERE event_id = '${GLOBAL_DECORATION_KEY}'`)
    await prisma.$executeRawUnsafe(
      `UPDATE decoration_state SET updated_at = ${now} WHERE id = '${GLOBAL_DECORATION_KEY}'`
    )
  } catch (err) {
    console.error('Error resetting decoration votes:', err)
  }

  return await getDecorationEvent()
}
