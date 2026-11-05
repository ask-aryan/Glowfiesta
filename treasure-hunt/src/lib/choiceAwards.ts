import { prisma } from './db'

export type ChoiceAwardsStatus = 'LIVE' | 'CLOSED'
export type ChoiceAwardsMode = 'SETUP' | 'LIVE_VOTING' | 'CEREMONY'
export type QuestionVotingState = 'IDLE' | 'VOTING' | 'PAUSED' | 'STOPPED'

export interface AwardNominee {
  id: string
  name: string
  role?: string
  avatar?: string
  photoUrl?: string | null
  videoUrl?: string | null
  votesCount: number
  percentage?: number
}

export interface AwardCategory {
  id: string
  orderIndex: number
  title: string
  subtitle?: string
  nominees: AwardNominee[]
  totalVotes: number
  winnerNomineeId?: string | null
}

export interface ChoiceAwardsState {
  id: string
  title: string
  status: ChoiceAwardsStatus // LIVE = accepting, CLOSED = closed
  mode: ChoiceAwardsMode // SETUP | LIVE_VOTING | CEREMONY
  activeCategoryId: string | null
  questionVotingState: QuestionVotingState // IDLE | VOTING | PAUSED | STOPPED
  ceremonyCategoryId: string | null
  ceremonyRevealed: boolean
  totalBallots: number
  categories: AwardCategory[]
  updatedAt: number
}

const GLOBAL_AWARDS_KEY = 'CHOICE_AWARDS_MAIN'

// In-memory cache
const globalAwardsStore = globalThis as unknown as {
  choiceAwardsCache?: ChoiceAwardsState | null
  choiceAwardsTablesReady?: boolean
}

async function addColumnIfMissing(table: string, column: string, def: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}' LIMIT 1`
    )
    if (!rows || rows.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
    }
  } catch {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
    } catch {}
  }
}

async function ensureTables() {
  if (globalAwardsStore.choiceAwardsTablesReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS choice_awards_state (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'LIVE',
        mode VARCHAR(30) NOT NULL DEFAULT 'LIVE_VOTING',
        active_category_id VARCHAR(100) NULL,
        question_voting_state VARCHAR(30) NOT NULL DEFAULT 'IDLE',
        ceremony_category_id VARCHAR(100) NULL,
        ceremony_revealed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at BIGINT NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS choice_awards_categories (
        id VARCHAR(100) PRIMARY KEY,
        awards_id VARCHAR(50) NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS choice_awards_nominees (
        id VARCHAR(100) PRIMARY KEY,
        category_id VARCHAR(100) NOT NULL,
        awards_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NULL,
        avatar VARCHAR(50) NULL,
        photo_url LONGTEXT NULL,
        video_url LONGTEXT NULL,
        order_index INT NOT NULL DEFAULT 0
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS choice_awards_ballots (
        id VARCHAR(150) PRIMARY KEY,
        awards_id VARCHAR(50) NOT NULL,
        category_id VARCHAR(100) NOT NULL,
        nominee_id VARCHAR(100) NOT NULL,
        voter_hash VARCHAR(150) NOT NULL,
        voted_at BIGINT NOT NULL
      )
    `)

    // Ensure columns exist on legacy tables safely without 'IF NOT EXISTS' (fails on MySQL 8.0.26)
    await addColumnIfMissing('choice_awards_nominees', 'photo_url', 'LONGTEXT NULL')
    await addColumnIfMissing('choice_awards_nominees', 'video_url', 'LONGTEXT NULL')
    await addColumnIfMissing('choice_awards_state', 'mode', "VARCHAR(30) DEFAULT 'LIVE_VOTING'")
    await addColumnIfMissing('choice_awards_state', 'active_category_id', 'VARCHAR(100) NULL')
    await addColumnIfMissing('choice_awards_state', 'question_voting_state', "VARCHAR(30) DEFAULT 'IDLE'")
    await addColumnIfMissing('choice_awards_state', 'ceremony_category_id', 'VARCHAR(100) NULL')
    await addColumnIfMissing('choice_awards_state', 'ceremony_revealed', 'BOOLEAN DEFAULT FALSE')

    // If photo_url or video_url is TEXT, upgrade to LONGTEXT
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE choice_awards_nominees MODIFY COLUMN photo_url LONGTEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE choice_awards_nominees MODIFY COLUMN video_url LONGTEXT`)
    } catch {}

    globalAwardsStore.choiceAwardsTablesReady = true
  } catch (err) {
    console.warn('Notice: Choice Awards tables check:', err)
  }
}

export async function getChoiceAwards(): Promise<ChoiceAwardsState> {
  await ensureTables()

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM choice_awards_state WHERE id = '${GLOBAL_AWARDS_KEY}' LIMIT 1`
    )

    const now = Date.now()
    if (!rows || rows.length === 0) {
      // Create empty state — NO default categories as requested
      await prisma.$executeRawUnsafe(
        `INSERT INTO choice_awards_state (id, title, status, mode, active_category_id, question_voting_state, ceremony_category_id, ceremony_revealed, updated_at)
         VALUES ('${GLOBAL_AWARDS_KEY}', 'GlowFiesta Choice Awards 2026', 'LIVE', 'LIVE_VOTING', NULL, 'IDLE', NULL, FALSE, ${now})`
      )
    }

    const stateRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM choice_awards_state WHERE id = '${GLOBAL_AWARDS_KEY}' LIMIT 1`
    )
    const stateRow = stateRows[0] || {}
    const status = (stateRow.status as ChoiceAwardsStatus) || 'LIVE'
    const mode = (stateRow.mode as ChoiceAwardsMode) || 'LIVE_VOTING'
    let activeCategoryId = stateRow.active_category_id || null
    const questionVotingState = (stateRow.question_voting_state as QuestionVotingState) || 'IDLE'
    let ceremonyCategoryId = stateRow.ceremony_category_id || null
    const ceremonyRevealed = Boolean(stateRow.ceremony_revealed)
    const title = stateRow.title || 'GlowFiesta Choice Awards 2026'
    const updatedAt = Number(stateRow.updated_at || now)

    // Load categories
    const catRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM choice_awards_categories WHERE awards_id = '${GLOBAL_AWARDS_KEY}' ORDER BY order_index ASC`
    )

    // Load nominees
    const nomRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM choice_awards_nominees WHERE awards_id = '${GLOBAL_AWARDS_KEY}' ORDER BY order_index ASC`
    )

    // Load votes
    const ballotRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM choice_awards_ballots WHERE awards_id = '${GLOBAL_AWARDS_KEY}'`
    )

    // Count distinct ballots (unique voter_hash)
    const distinctVoters = new Set<string>()
    for (const b of ballotRows || []) {
      if (b.voter_hash) distinctVoters.add(b.voter_hash)
    }

    // Tally votes per nominee & category
    const votesPerNominee = new Map<string, number>()
    const votesPerCategory = new Map<string, number>()
    for (const b of ballotRows || []) {
      const nId = b.nominee_id
      const cId = b.category_id
      votesPerNominee.set(nId, (votesPerNominee.get(nId) || 0) + 1)
      votesPerCategory.set(cId, (votesPerCategory.get(cId) || 0) + 1)
    }

    // Group nominees by category
    const nomineesByCat = new Map<string, AwardNominee[]>()
    for (const n of nomRows || []) {
      const cId = n.category_id
      if (!nomineesByCat.has(cId)) nomineesByCat.set(cId, [])
      const count = votesPerNominee.get(n.id) || 0
      nomineesByCat.get(cId)!.push({
        id: n.id,
        name: n.name,
        role: n.role || undefined,
        avatar: n.avatar || '⭐',
        photoUrl: n.photo_url || null,
        videoUrl: n.video_url || null,
        votesCount: count,
      })
    }

    const categories: AwardCategory[] = (catRows || []).map(c => {
      const nomList = nomineesByCat.get(c.id) || []
      const catTotal = votesPerCategory.get(c.id) || 0

      // Calculate percentages & winner
      let highestVotes = -1
      let winnerId: string | null = null

      const mappedNominees = nomList.map(n => {
        const pct = catTotal > 0 ? Math.round((n.votesCount / catTotal) * 100) : 0
        if (n.votesCount > highestVotes && n.votesCount > 0) {
          highestVotes = n.votesCount
          winnerId = n.id
        }
        return {
          ...n,
          percentage: pct,
        }
      })

      return {
        id: c.id,
        orderIndex: Number(c.order_index ?? 0),
        title: c.title,
        subtitle: c.subtitle || undefined,
        nominees: mappedNominees,
        totalVotes: catTotal,
        winnerNomineeId: winnerId,
      }
    })

    // If activeCategoryId is not set or invalid, default to the first category if any exist
    if (categories.length > 0) {
      if (!activeCategoryId || !categories.some(c => c.id === activeCategoryId)) {
        activeCategoryId = categories[0].id
      }
      if (!ceremonyCategoryId || !categories.some(c => c.id === ceremonyCategoryId)) {
        ceremonyCategoryId = categories[0].id
      }
    } else {
      activeCategoryId = null
      ceremonyCategoryId = null
    }

    const state: ChoiceAwardsState = {
      id: GLOBAL_AWARDS_KEY,
      title,
      status,
      mode,
      activeCategoryId,
      questionVotingState,
      ceremonyCategoryId,
      ceremonyRevealed,
      totalBallots: distinctVoters.size,
      categories,
      updatedAt,
    }

    globalAwardsStore.choiceAwardsCache = state
    return state
  } catch (err) {
    console.warn('Error reading Choice Awards from DB:', err)
    if (globalAwardsStore.choiceAwardsCache) {
      return globalAwardsStore.choiceAwardsCache
    }
    return {
      id: GLOBAL_AWARDS_KEY,
      title: 'GlowFiesta Choice Awards 2026',
      status: 'LIVE',
      mode: 'LIVE_VOTING',
      activeCategoryId: null,
      questionVotingState: 'IDLE',
      ceremonyCategoryId: null,
      ceremonyRevealed: false,
      totalBallots: 0,
      categories: [],
      updatedAt: Date.now(),
    }
  }
}

export async function setChoiceAwardsStatus(status: ChoiceAwardsStatus): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state SET status = '${status}', updated_at = ${now} WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )
  } catch (err) {
    console.warn('Error updating Choice Awards status:', err)
  }

  return await getChoiceAwards()
}

export async function updateChoiceAwardsLiveControl(payload: {
  action:
    | 'SET_ACTIVE_CATEGORY'
    | 'START_VOTE'
    | 'PAUSE_VOTE'
    | 'RESUME_VOTE'
    | 'STOP_VOTE'
    | 'RESET_QUESTION_VOTES'
    | 'SET_MODE'
    | 'SET_CEREMONY_CATEGORY'
    | 'REVEAL_CEREMONY'
  categoryId?: string
  mode?: ChoiceAwardsMode
}): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()
  const { action, categoryId, mode } = payload

  try {
    if (action === 'SET_ACTIVE_CATEGORY' && categoryId) {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET active_category_id = '${categoryId.replace(/'/g, "''")}', 
             question_voting_state = 'IDLE', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'START_VOTE') {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET question_voting_state = 'VOTING', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'PAUSE_VOTE') {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET question_voting_state = 'PAUSED', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'RESUME_VOTE') {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET question_voting_state = 'VOTING', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'STOP_VOTE') {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET question_voting_state = 'STOPPED', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'RESET_QUESTION_VOTES') {
      const currentState = await getChoiceAwards()
      const catId = categoryId || currentState.activeCategoryId
      if (catId) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM choice_awards_ballots 
           WHERE awards_id = '${GLOBAL_AWARDS_KEY}' AND category_id = '${catId.replace(/'/g, "''")}'`
        )
      }
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET question_voting_state = 'IDLE', 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'SET_MODE' && mode) {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET mode = '${mode}', 
             ceremony_revealed = FALSE,
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'SET_CEREMONY_CATEGORY' && categoryId) {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET ceremony_category_id = '${categoryId.replace(/'/g, "''")}', 
             ceremony_revealed = FALSE,
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    } else if (action === 'REVEAL_CEREMONY') {
      await prisma.$executeRawUnsafe(
        `UPDATE choice_awards_state 
         SET ceremony_revealed = TRUE, 
             updated_at = ${now} 
         WHERE id = '${GLOBAL_AWARDS_KEY}'`
      )
    }
  } catch (err) {
    console.error('Error updating live control:', err)
  }

  return await getChoiceAwards()
}

export async function submitChoiceAwardsVote(payload: {
  categoryId: string
  nomineeId: string
  voterHash: string
}): Promise<{ success: boolean; message: string; categoryTotal?: number; totalBallots?: number }> {
  await ensureTables()

  const state = await getChoiceAwards()
  if (state.status === 'CLOSED') {
    return { success: false, message: 'Voting is currently closed by host.' }
  }

  if (state.mode !== 'LIVE_VOTING') {
    return { success: false, message: 'Live voting is not currently active.' }
  }

  if (state.questionVotingState !== 'VOTING') {
    return {
      success: false,
      message:
        state.questionVotingState === 'PAUSED'
          ? 'Voting is temporarily paused. Please hold on!'
          : 'Voting is not open for this category right now.',
    }
  }

  const { categoryId, nomineeId, voterHash } = payload
  if (!categoryId || !nomineeId) {
    return { success: false, message: 'Please select a nominee to vote for.' }
  }

  if (state.activeCategoryId && state.activeCategoryId !== categoryId) {
    return { success: false, message: 'Host has already advanced to another question.' }
  }

  const now = Date.now()
  const cleanHash = voterHash.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `anon_${Math.random().toString(36).substring(2, 10)}`

  try {
    // Check if this voter already voted for THIS category (1 vote per device per category)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM choice_awards_ballots 
       WHERE awards_id = '${GLOBAL_AWARDS_KEY}' 
         AND category_id = '${categoryId.replace(/'/g, "''")}' 
         AND voter_hash = '${cleanHash}' 
       LIMIT 1`
    )

    if (existing && existing.length > 0) {
      return {
        success: false,
        message: 'You have already cast your vote for this category from this device.',
      }
    }

    const voteId = `b_${cleanHash}_${categoryId.slice(-8)}_${Date.now().toString(36)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO choice_awards_ballots (id, awards_id, category_id, nominee_id, voter_hash, voted_at)
       VALUES ('${voteId}', '${GLOBAL_AWARDS_KEY}', '${categoryId.replace(/'/g, "''")}', '${nomineeId.replace(/'/g, "''")}', '${cleanHash}', ${now})`
    )

    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state SET updated_at = ${now} WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )

    const updated = await getChoiceAwards()
    const thisCat = updated.categories.find(c => c.id === categoryId)

    return {
      success: true,
      message: 'Your vote has been recorded! Thank you for voting.',
      categoryTotal: thisCat?.totalVotes ?? 1,
      totalBallots: updated.totalBallots,
    }
  } catch (err) {
    console.error('Error submitting vote:', err)
    return { success: false, message: 'Failed to record vote. Please try again.' }
  }
}

// Backward-compatible multi-ballot submission
export async function submitChoiceAwardsBallot(
  votes: Record<string, string>,
  voterHash: string
): Promise<{ success: boolean; message: string; totalBallots?: number }> {
  await ensureTables()
  const entries = Object.entries(votes)
  if (entries.length === 0) {
    return { success: false, message: 'Please select nominees before submitting.' }
  }

  let lastRes = { success: false, message: 'Failed to vote' }
  for (const [catId, nomId] of entries) {
    lastRes = await submitChoiceAwardsVote({
      categoryId: catId,
      nomineeId: nomId,
      voterHash,
    })
  }
  return lastRes
}

export async function saveChoiceAwardsCategories(categories: AwardCategory[]): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$transaction(async (tx) => {
      // Clean old
      await tx.$executeRaw`DELETE FROM choice_awards_nominees WHERE awards_id = ${GLOBAL_AWARDS_KEY}`
      await tx.$executeRaw`DELETE FROM choice_awards_categories WHERE awards_id = ${GLOBAL_AWARDS_KEY}`

      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        const cat = categories[cIdx]
        const catId = cat.id || `cat_${Date.now()}_${cIdx}`
        await tx.$executeRaw`
          INSERT INTO choice_awards_categories (id, awards_id, order_index, title, subtitle)
          VALUES (${catId}, ${GLOBAL_AWARDS_KEY}, ${cIdx}, ${cat.title || 'Untitled Category'}, ${cat.subtitle || null})
        `

        const nomList = Array.isArray(cat.nominees) ? cat.nominees : []
        for (let nIdx = 0; nIdx < nomList.length; nIdx++) {
          const nom = nomList[nIdx]
          const nomId = nom.id || `nom_${Date.now()}_${nIdx}`
          const photo = nom.photoUrl ?? (nom as any).photo_url ?? null
          const video = nom.videoUrl ?? (nom as any).video_url ?? null

          await tx.$executeRaw`
            INSERT INTO choice_awards_nominees (id, category_id, awards_id, name, role, avatar, photo_url, video_url, order_index)
            VALUES (${nomId}, ${catId}, ${GLOBAL_AWARDS_KEY}, ${nom.name || 'Nominee'}, ${nom.role || null}, ${nom.avatar || '⭐'}, ${photo}, ${video}, ${nIdx})
          `
        }
      }

      const firstCatId = categories.length > 0 ? (categories[0].id || `cat_${Date.now()}_0`) : null

      await tx.$executeRaw`
        UPDATE choice_awards_state 
        SET active_category_id = COALESCE(active_category_id, ${firstCatId}),
            ceremony_category_id = COALESCE(ceremony_category_id, ${firstCatId}),
            updated_at = ${now} 
        WHERE id = ${GLOBAL_AWARDS_KEY}
      `
    })
  } catch (err) {
    console.error('Error saving Choice Awards categories:', err)
    throw err
  }

  return await getChoiceAwards()
}

export async function resetChoiceAwardsBallots(): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM choice_awards_ballots WHERE awards_id = '${GLOBAL_AWARDS_KEY}'`)
    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state 
       SET question_voting_state = 'IDLE',
           ceremony_revealed = FALSE,
           updated_at = ${now} 
       WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )
  } catch (err) {
    console.error('Error resetting Choice Awards ballots:', err)
  }

  return await getChoiceAwards()
}
