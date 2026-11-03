import { prisma } from './db'

export type ChoiceAwardsStatus = 'LIVE' | 'CLOSED'

export interface AwardNominee {
  id: string
  name: string
  role?: string
  avatar?: string
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
  status: ChoiceAwardsStatus // LIVE = Accepting responses, CLOSED = Stopped
  totalBallots: number
  categories: AwardCategory[]
  updatedAt: number
}

const GLOBAL_AWARDS_KEY = 'CHOICE_AWARDS_MAIN'

// In-memory cache for ultra-fast polling
const globalAwardsStore = globalThis as unknown as {
  choiceAwardsCache?: ChoiceAwardsState | null
  choiceAwardsTablesReady?: boolean
}

const DEFAULT_CATEGORIES: AwardCategory[] = [
  {
    id: 'cat_star_performer',
    orderIndex: 0,
    title: 'Star Performer of the Year 🌟',
    subtitle: 'Consistently delivered excellence, passion, and high impact execution',
    totalVotes: 0,
    nominees: [
      { id: 'nom_1', name: 'Team Alpha', role: 'Engineering & Architecture', avatar: '🚀', votesCount: 0 },
      { id: 'nom_2', name: 'Team Beta', role: 'Product & Innovation', avatar: '💡', votesCount: 0 },
      { id: 'nom_3', name: 'Team Gamma', role: 'Operations & Reliability', avatar: '⚡', votesCount: 0 },
      { id: 'nom_4', name: 'Team Delta', role: 'Quality & Delivery', avatar: '🛡️', votesCount: 0 },
    ],
  },
  {
    id: 'cat_culture_champion',
    orderIndex: 1,
    title: 'Best Team Player & Culture Hero 🤝',
    subtitle: 'Always lifting others up, fostering teamwork and spreading positivity',
    totalVotes: 0,
    nominees: [
      { id: 'nom_5', name: 'Synergy Squad', role: 'Collaboration Masters', avatar: '🌟', votesCount: 0 },
      { id: 'nom_6', name: 'Rising Stars', role: 'Spirit & Dedication', avatar: '✨', votesCount: 0 },
      { id: 'nom_7', name: 'Pixel Pioneers', role: 'Community & Support', avatar: '🎨', votesCount: 0 },
    ],
  },
  {
    id: 'cat_innovation_maestro',
    orderIndex: 2,
    title: 'Innovation & Creative Maestro 💡',
    subtitle: 'Brought creative breakthrough ideas and out-of-the-box thinking',
    totalVotes: 0,
    nominees: [
      { id: 'nom_8', name: 'Code Ninjas', role: 'AI & Next-Gen R&D', avatar: '🥋', votesCount: 0 },
      { id: 'nom_9', name: 'Data Wizards', role: 'Analytics & Insights', avatar: '🔮', votesCount: 0 },
      { id: 'nom_10', name: 'Tech Titans', role: 'Cloud & Modernization', avatar: '⚡', votesCount: 0 },
    ],
  },
  {
    id: 'cat_speed_execution',
    orderIndex: 3,
    title: 'Speed & Lightning Execution ⚡',
    subtitle: 'Master of high velocity deadlines and rapid reliable delivery',
    totalVotes: 0,
    nominees: [
      { id: 'nom_11', name: 'Agile Aces', role: 'Sprint Champions', avatar: '🏎️', votesCount: 0 },
      { id: 'nom_12', name: 'Velocity Force', role: 'Zero-Lag Deployment', avatar: '🌪️', votesCount: 0 },
      { id: 'nom_13', name: 'Rapid Fire', role: 'Quick Resolution Squad', avatar: '🔥', votesCount: 0 },
    ],
  },
  {
    id: 'cat_office_joymaker',
    orderIndex: 4,
    title: 'Office Joymaker & Energy Booster 😂',
    subtitle: 'The soul of the office who turns any stressful day into smiles and laughter',
    totalVotes: 0,
    nominees: [
      { id: 'nom_14', name: 'Vibe Masters', role: 'Celebrations & Fun', avatar: '🎉', votesCount: 0 },
      { id: 'nom_15', name: 'Chai & Chill Club', role: 'Positive Vibes Only', avatar: '☕', votesCount: 0 },
      { id: 'nom_16', name: 'Happy Hour Heroes', role: 'Memes & Motivation', avatar: '🥳', votesCount: 0 },
    ],
  },
]

async function ensureTables() {
  if (globalAwardsStore.choiceAwardsTablesReady) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS choice_awards_state (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'LIVE',
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

    if (!rows || rows.length === 0) {
      // Seed default awards
      return await seedInitialAwards()
    }

    const stateRow = rows[0]
    const status = (stateRow.status as ChoiceAwardsStatus) || 'LIVE'
    const title = stateRow.title || 'GlowFiesta Choice Awards 2026'
    const updatedAt = Number(stateRow.updated_at || Date.now())

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

    // Tally votes per nominee
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

    const state: ChoiceAwardsState = {
      id: GLOBAL_AWARDS_KEY,
      title,
      status,
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
      totalBallots: 0,
      categories: DEFAULT_CATEGORIES,
      updatedAt: Date.now(),
    }
  }
}

async function seedInitialAwards(): Promise<ChoiceAwardsState> {
  const now = Date.now()
  const title = 'GlowFiesta Choice Awards 2026'

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO choice_awards_state (id, title, status, updated_at)
       VALUES ('${GLOBAL_AWARDS_KEY}', '${title}', 'LIVE', ${now})`
    )

    for (let cIdx = 0; cIdx < DEFAULT_CATEGORIES.length; cIdx++) {
      const cat = DEFAULT_CATEGORIES[cIdx]
      await prisma.$executeRawUnsafe(
        `INSERT INTO choice_awards_categories (id, awards_id, order_index, title, subtitle)
         VALUES ('${cat.id}', '${GLOBAL_AWARDS_KEY}', ${cIdx}, '${cat.title.replace(/'/g, "''")}', '${(cat.subtitle || '').replace(/'/g, "''")}')`
      )

      for (let nIdx = 0; nIdx < cat.nominees.length; nIdx++) {
        const nom = cat.nominees[nIdx]
        await prisma.$executeRawUnsafe(
          `INSERT INTO choice_awards_nominees (id, category_id, awards_id, name, role, avatar, order_index)
           VALUES ('${nom.id}', '${cat.id}', '${GLOBAL_AWARDS_KEY}', '${nom.name.replace(/'/g, "''")}', '${(nom.role || '').replace(/'/g, "''")}', '${nom.avatar || '⭐'}', ${nIdx})`
        )
      }
    }
  } catch (e) {
    console.warn('Notice: Seeding choice awards initial data:', e)
  }

  const seeded: ChoiceAwardsState = {
    id: GLOBAL_AWARDS_KEY,
    title,
    status: 'LIVE',
    totalBallots: 0,
    categories: DEFAULT_CATEGORIES,
    updatedAt: now,
  }
  globalAwardsStore.choiceAwardsCache = seeded
  return seeded
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

export async function submitChoiceAwardsBallot(
  votes: Record<string, string>, // { [categoryId]: nomineeId }
  voterHash: string
): Promise<{ success: boolean; message: string; totalBallots?: number }> {
  await ensureTables()

  const state = await getChoiceAwards()
  if (state.status === 'CLOSED') {
    return {
      success: false,
      message: 'Voting is currently closed. Host has stopped accepting responses.',
    }
  }

  const categoryEntries = Object.entries(votes)
  if (categoryEntries.length === 0) {
    return { success: false, message: 'Please select nominees before submitting.' }
  }

  const now = Date.now()
  const cleanHash = voterHash.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `anon_${Math.random().toString(36).substring(2, 10)}`

  try {
    // Delete previous ballot for this voter if updating
    await prisma.$executeRawUnsafe(
      `DELETE FROM choice_awards_ballots WHERE awards_id = '${GLOBAL_AWARDS_KEY}' AND voter_hash = '${cleanHash}'`
    )

    // Insert each vote
    for (const [categoryId, nomineeId] of categoryEntries) {
      if (!nomineeId) continue
      const voteId = `b_${cleanHash}_${categoryId.slice(-12)}_${Date.now().toString(36)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO choice_awards_ballots (id, awards_id, category_id, nominee_id, voter_hash, voted_at)
         VALUES ('${voteId}', '${GLOBAL_AWARDS_KEY}', '${categoryId.replace(/'/g, "''")}', '${nomineeId.replace(/'/g, "''")}', '${cleanHash}', ${now})`
      )
    }

    // Touch updated_at
    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state SET updated_at = ${now} WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )

    const updated = await getChoiceAwards()
    return {
      success: true,
      message: 'Your Choice Awards ballot has been recorded!',
      totalBallots: updated.totalBallots,
    }
  } catch (err) {
    console.error('Error recording Choice Awards ballot:', err)
    return { success: false, message: 'Failed to record vote. Please try again.' }
  }
}

export async function saveChoiceAwardsCategories(categories: AwardCategory[]): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()

  try {
    // Remove existing categories and nominees
    await prisma.$executeRawUnsafe(
      `DELETE FROM choice_awards_nominees WHERE awards_id = '${GLOBAL_AWARDS_KEY}'`
    )
    await prisma.$executeRawUnsafe(
      `DELETE FROM choice_awards_categories WHERE awards_id = '${GLOBAL_AWARDS_KEY}'`
    )

    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const cat = categories[cIdx]
      const catId = cat.id || `cat_${Date.now()}_${cIdx}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO choice_awards_categories (id, awards_id, order_index, title, subtitle)
         VALUES ('${catId}', '${GLOBAL_AWARDS_KEY}', ${cIdx}, '${(cat.title || 'Untitled Category').replace(/'/g, "''")}', '${(cat.subtitle || '').replace(/'/g, "''")}')`
      )

      for (let nIdx = 0; nIdx < cat.nominees.length; nIdx++) {
        const nom = cat.nominees[nIdx]
        const nomId = nom.id || `nom_${Date.now()}_${nIdx}`
        await prisma.$executeRawUnsafe(
          `INSERT INTO choice_awards_nominees (id, category_id, awards_id, name, role, avatar, order_index)
           VALUES ('${nomId}', '${catId}', '${GLOBAL_AWARDS_KEY}', '${(nom.name || 'Nominee').replace(/'/g, "''")}', '${(nom.role || '').replace(/'/g, "''")}', '${nom.avatar || '⭐'}', ${nIdx})`
        )
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state SET updated_at = ${now} WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )
  } catch (err) {
    console.error('Error saving Choice Awards categories:', err)
  }

  return await getChoiceAwards()
}

export async function resetChoiceAwardsBallots(): Promise<ChoiceAwardsState> {
  await ensureTables()
  const now = Date.now()

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM choice_awards_ballots WHERE awards_id = '${GLOBAL_AWARDS_KEY}'`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE choice_awards_state SET updated_at = ${now} WHERE id = '${GLOBAL_AWARDS_KEY}'`
    )
  } catch (err) {
    console.error('Error resetting Choice Awards ballots:', err)
  }

  return await getChoiceAwards()
}
