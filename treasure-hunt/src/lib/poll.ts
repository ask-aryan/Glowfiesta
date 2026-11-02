import { prisma } from './db'

export type PollStatus = 'DRAFT' | 'READY' | 'LIVE' | 'STOPPED' | 'COMPLETED'

export interface PollOption {
  id: string
  text: string
  description?: string
  imageUrl?: string
  votesCount: number
}

export interface PollQuestion {
  id: string
  title: string
  subtitle?: string
  options: PollOption[]
  totalVotes: number
  winnerOptionId?: string | null
}

export interface PollVote {
  id: string
  roomCode: string
  questionId: string
  optionId: string
  voterId: string
  voterName: string
  isAnonymous: boolean
  votedAt: number
}

export interface PollRoom {
  id: string // roomCode e.g. "PL-8429"
  title: string
  hostKey: string
  status: PollStatus
  activeQuestionIndex: number
  showResultsLive: boolean
  createdAt: number
  updatedAt: number
  questions: PollQuestion[]
  votes: PollVote[]
}

// In-memory store for fallback and sub-millisecond fast lookups
const globalPollStore = globalThis as unknown as {
  pollRooms?: Map<string, PollRoom>
  pollTablesInitialized?: boolean
}

if (!globalPollStore.pollRooms) {
  globalPollStore.pollRooms = new Map<string, PollRoom>()
}

const rooms = globalPollStore.pollRooms

// Ensure DB tables exist for persistence across server restarts / lambdas
async function ensureTables() {
  if (globalPollStore.pollTablesInitialized) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS poll_rooms (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        host_key VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        active_question_index INT NOT NULL DEFAULT 0,
        show_results_live INT NOT NULL DEFAULT 1,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS poll_questions (
        id VARCHAR(100) PRIMARY KEY,
        room_code VARCHAR(50) NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NULL,
        winner_option_id VARCHAR(100) NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id VARCHAR(100) PRIMARY KEY,
        question_id VARCHAR(100) NOT NULL,
        room_code VARCHAR(50) NOT NULL,
        text VARCHAR(255) NOT NULL,
        description VARCHAR(255) NULL,
        image_url TEXT NULL,
        order_index INT NOT NULL DEFAULT 0
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id VARCHAR(150) PRIMARY KEY,
        room_code VARCHAR(50) NOT NULL,
        question_id VARCHAR(100) NOT NULL,
        option_id VARCHAR(100) NOT NULL,
        voter_id VARCHAR(100) NOT NULL,
        voter_name VARCHAR(100) NOT NULL,
        is_anonymous INT NOT NULL DEFAULT 0,
        voted_at BIGINT NOT NULL
      )
    `)
    globalPollStore.pollTablesInitialized = true
  } catch (err) {
    console.warn('Notice: poll tables check completed or deferred:', err)
  }
}

function generatePollCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateHostKey(): string {
  return 'pk_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
}

export async function createPollRoom(title?: string): Promise<PollRoom> {
  await ensureTables()
  let code = generatePollCode()
  while (rooms.has(code)) {
    code = generatePollCode()
  }

  const now = Date.now()
  const pollTitle = (title || '').trim() || `Live Poll Room ${code}`
  const hostKey = generateHostKey()

  // Default initial award question
  const defaultQuestionId = `q_${code}_1`
  const defaultQuestion: PollQuestion = {
    id: defaultQuestionId,
    title: 'Star Performer of the Year',
    subtitle: 'Category: Outstanding Energy & Dedication',
    options: [
      { id: `opt_${code}_1`, text: 'Nominee 1: Team Alpha', description: 'Best Project Delivery', votesCount: 0 },
      { id: `opt_${code}_2`, text: 'Nominee 2: Team Beta', description: 'Outstanding Innovation', votesCount: 0 },
      { id: `opt_${code}_3`, text: 'Nominee 3: Team Gamma', description: 'Highest Team Spirit', votesCount: 0 },
    ],
    totalVotes: 0,
  }

  const room: PollRoom = {
    id: code,
    title: pollTitle,
    hostKey,
    status: 'DRAFT',
    activeQuestionIndex: 0,
    showResultsLive: true,
    createdAt: now,
    updatedAt: now,
    questions: [defaultQuestion],
    votes: [],
  }

  rooms.set(code, room)

  // Persist to DB synchronously with await to prevent serverless freezing
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO poll_rooms (id, title, host_key, status, active_question_index, show_results_live, created_at, updated_at)
       VALUES ('${code}', '${pollTitle.replace(/'/g, "''")}', '${hostKey}', 'DRAFT', 0, 1, ${now}, ${now})`
    )
    await prisma.$executeRawUnsafe(
      `INSERT INTO poll_questions (id, room_code, order_index, title, subtitle, winner_option_id)
       VALUES ('${defaultQuestionId}', '${code}', 0, '${defaultQuestion.title.replace(/'/g, "''")}', '${(defaultQuestion.subtitle || '').replace(/'/g, "''")}', NULL)`
    )
    for (let i = 0; i < defaultQuestion.options.length; i++) {
      const opt = defaultQuestion.options[i]
      await prisma.$executeRawUnsafe(
        `INSERT INTO poll_options (id, question_id, room_code, text, description, image_url, order_index)
         VALUES ('${opt.id}', '${defaultQuestionId}', '${code}', '${opt.text.replace(/'/g, "''")}', '${(opt.description || '').replace(/'/g, "''")}', NULL, ${i})`
      )
    }
  } catch (err) {
    console.warn('Notice: writing new poll room to DB:', err)
  }

  return room
}

export async function getPollRoom(roomCode: string): Promise<PollRoom | null> {
  const code = roomCode.toUpperCase().trim()
  if (!code) return null

  await ensureTables()

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM poll_rooms WHERE id = '${code.replace(/'/g, "''")}' LIMIT 1`
    )
    if (rows && rows.length > 0) {
      const r = rows[0]
      const dbRoom: PollRoom = {
        id: r.id,
        title: r.title,
        hostKey: r.host_key,
        status: (r.status as PollStatus) || 'DRAFT',
        activeQuestionIndex: Number(r.active_question_index || 0),
        showResultsLive: Boolean(r.show_results_live ?? 1),
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now()),
        questions: [],
        votes: [],
      }

      // Load questions
      const qRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM poll_questions WHERE room_code = '${code.replace(/'/g, "''")}' ORDER BY order_index ASC`
      )

      // Load options
      const optRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM poll_options WHERE room_code = '${code.replace(/'/g, "''")}' ORDER BY order_index ASC`
      )

      // Load votes
      const vRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM poll_votes WHERE room_code = '${code.replace(/'/g, "''")}'`
      )

      dbRoom.votes = (vRows || []).map(v => ({
        id: v.id,
        roomCode: v.room_code,
        questionId: v.question_id,
        optionId: v.option_id,
        voterId: v.voter_id,
        voterName: v.voter_name,
        isAnonymous: Boolean(v.is_anonymous),
        votedAt: Number(v.voted_at),
      }))

      const questionsMap = new Map<string, PollQuestion & { orderIndex: number }>()
      for (const q of qRows || []) {
        questionsMap.set(q.id, {
          id: q.id,
          title: q.title,
          subtitle: q.subtitle || undefined,
          winnerOptionId: q.winner_option_id || null,
          options: [],
          totalVotes: 0,
          orderIndex: Number(q.order_index ?? 0),
        })
      }

      for (const opt of optRows || []) {
        const q = questionsMap.get(opt.question_id)
        if (q) {
          const votesForOpt = dbRoom.votes.filter(v => v.questionId === opt.question_id && v.optionId === opt.id).length
          q.options.push({
            id: opt.id,
            text: opt.text,
            description: opt.description || undefined,
            imageUrl: opt.image_url || undefined,
            votesCount: votesForOpt,
          })
        }
      }

      const sortedQuestions = Array.from(questionsMap.values()).sort((a, b) => a.orderIndex - b.orderIndex)
      sortedQuestions.forEach(q => {
        q.totalVotes = q.options.reduce((sum: number, o: PollOption) => sum + o.votesCount, 0)
        dbRoom.questions.push(q)
      })

      // If DB has room but questions empty, fallback to memory questions if available
      const memRoom = rooms.get(code)
      if (dbRoom.questions.length === 0 && memRoom && memRoom.questions.length > 0) {
        dbRoom.questions = memRoom.questions
      }

      // Ensure activeQuestionIndex is within valid bounds
      if (dbRoom.questions.length > 0 && dbRoom.activeQuestionIndex >= dbRoom.questions.length) {
        dbRoom.activeQuestionIndex = dbRoom.questions.length - 1
      }

      rooms.set(code, dbRoom)
      return dbRoom
    }
  } catch (err) {
    console.warn('Notice: reading poll room from DB fallback to memory:', err)
  }

  // Fallback to in-memory store if DB query returned nothing or failed
  if (rooms.has(code)) {
    return rooms.get(code)!
  }

  return null
}

export async function updatePollStatus(
  roomCode: string,
  hostKey: string,
  status: PollStatus,
  winnerOptionId?: string | null
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null

  room.status = status
  room.updatedAt = Date.now()

  const activeQ = room.questions[room.activeQuestionIndex]
  if (status === 'COMPLETED' && activeQ) {
    if (winnerOptionId) {
      activeQ.winnerOptionId = winnerOptionId
    } else if (activeQ.options.length > 0) {
      // Automatically pick highest voted option as winner if not explicitly passed
      const sorted = [...activeQ.options].sort((a, b) => b.votesCount - a.votesCount)
      activeQ.winnerOptionId = sorted[0]?.id || null
    }
  }

  // Sync memory store
  rooms.set(room.id, room)

  // Persist to DB with await
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE poll_rooms SET status = '${status}', updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
    if (status === 'COMPLETED' && activeQ?.winnerOptionId) {
      await prisma.$executeRawUnsafe(
        `UPDATE poll_questions SET winner_option_id = '${activeQ.winnerOptionId.replace(/'/g, "''")}' WHERE id = '${activeQ.id}'`
      )
    }
  } catch (err) {
    console.warn('Error updating poll status in DB:', err)
  }

  return room
}

export async function setActiveQuestion(
  roomCode: string,
  hostKey: string,
  index: number
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null
  if (index < 0 || index >= room.questions.length) return null

  room.activeQuestionIndex = index
  room.updatedAt = Date.now()

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE poll_rooms SET active_question_index = ${index}, updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
  } catch (err) {
    console.warn('Error updating active question in DB:', err)
  }

  return room
}

export async function advanceToNextCategory(
  roomCode: string,
  hostKey: string
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null
  if (room.activeQuestionIndex >= room.questions.length - 1) return null

  room.activeQuestionIndex += 1
  room.status = 'READY'
  room.updatedAt = Date.now()

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE poll_rooms SET active_question_index = ${room.activeQuestionIndex}, status = 'READY', updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
  } catch (err) {
    console.warn('Notice: advanceToNextCategory DB write:', err)
  }

  return room
}

export async function updateQuestion(
  roomCode: string,
  hostKey: string,
  questionId: string,
  data: { title: string; subtitle?: string; options: Array<{ id?: string; text: string; description?: string; imageUrl?: string }> }
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null

  let q = room.questions.find(item => item.id === questionId)
  if (!q) {
    // Create new question
    q = {
      id: questionId || `q_${room.id}_${Date.now()}`,
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || undefined,
      options: [],
      totalVotes: 0,
    }
    room.questions.push(q)
  } else {
    q.title = data.title.trim()
    q.subtitle = data.subtitle?.trim() || undefined
  }

  // Update options while preserving vote counts for existing options
  const existingVotesMap = new Map(q.options.map(o => [o.id, o.votesCount]))
  q.options = data.options.map((opt, idx) => {
    const optId = opt.id || `opt_${room.id}_${Date.now()}_${idx}`
    return {
      id: optId,
      text: opt.text.trim(),
      description: opt.description?.trim() || undefined,
      imageUrl: opt.imageUrl?.trim() || undefined,
      votesCount: existingVotesMap.get(optId) || 0,
    }
  })
  q.totalVotes = q.options.reduce((sum, o) => sum + o.votesCount, 0)
  room.updatedAt = Date.now()

  rooms.set(room.id, room)

  try {
    const qIndex = room.questions.indexOf(q)
    // Upsert question in DB
    await prisma.$executeRawUnsafe(
      `INSERT INTO poll_questions (id, room_code, order_index, title, subtitle, winner_option_id)
       VALUES ('${q.id}', '${room.id}', ${qIndex}, '${q.title.replace(/'/g, "''")}', '${(q.subtitle || '').replace(/'/g, "''")}', NULL)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, order_index = ${qIndex}`
    ).catch(async () => {
      // MySQL fallback
      await prisma.$executeRawUnsafe(
        `INSERT INTO poll_questions (id, room_code, order_index, title, subtitle, winner_option_id)
         VALUES ('${q.id}', '${room.id}', ${qIndex}, '${q.title.replace(/'/g, "''")}', '${(q.subtitle || '').replace(/'/g, "''")}', NULL)
         ON DUPLICATE KEY UPDATE title = VALUES(title), subtitle = VALUES(subtitle), order_index = VALUES(order_index)`
      )
    })

    // Clean up removed options in DB
    const currentOptIds = q.options.map(o => `'${o.id}'`).join(',')
    if (currentOptIds.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM poll_options WHERE room_code = '${room.id}' AND question_id = '${q.id}' AND id NOT IN (${currentOptIds})`
      ).catch(() => {})
    }

    // Upsert options
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i]
      await prisma.$executeRawUnsafe(
        `INSERT INTO poll_options (id, question_id, room_code, text, description, image_url, order_index)
         VALUES ('${opt.id}', '${q.id}', '${room.id}', '${opt.text.replace(/'/g, "''")}', '${(opt.description || '').replace(/'/g, "''")}', NULL, ${i})
         ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, description = EXCLUDED.description, order_index = ${i}`
      ).catch(async () => {
        await prisma.$executeRawUnsafe(
          `INSERT INTO poll_options (id, question_id, room_code, text, description, image_url, order_index)
           VALUES ('${opt.id}', '${q.id}', '${room.id}', '${opt.text.replace(/'/g, "''")}', '${(opt.description || '').replace(/'/g, "''")}', NULL, ${i})
           ON DUPLICATE KEY UPDATE text = VALUES(text), description = VALUES(description), order_index = VALUES(order_index)`
        )
      })
    }
  } catch (err) {
    console.warn('Notice: updateQuestion DB write:', err)
  }

  return room
}

export async function deleteQuestion(
  roomCode: string,
  hostKey: string,
  questionId: string
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null
  if (room.questions.length <= 1) return null // Must preserve at least one category

  const qIndex = room.questions.findIndex(q => q.id === questionId)
  if (qIndex === -1) return null

  room.questions.splice(qIndex, 1)
  if (room.activeQuestionIndex >= room.questions.length) {
    room.activeQuestionIndex = room.questions.length - 1
  }
  room.updatedAt = Date.now()

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM poll_options WHERE room_code = '${room.id}' AND question_id = '${questionId}'`
    )
    await prisma.$executeRawUnsafe(
      `DELETE FROM poll_votes WHERE room_code = '${room.id}' AND question_id = '${questionId}'`
    )
    await prisma.$executeRawUnsafe(
      `DELETE FROM poll_questions WHERE room_code = '${room.id}' AND id = '${questionId}'`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE poll_rooms SET active_question_index = ${room.activeQuestionIndex}, updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
    for (let i = 0; i < room.questions.length; i++) {
      await prisma.$executeRawUnsafe(
        `UPDATE poll_questions SET order_index = ${i} WHERE id = '${room.questions[i].id}'`
      )
    }
  } catch (err) {
    console.warn('Notice: deleteQuestion DB write:', err)
  }

  return room
}

export async function castVote(
  roomCode: string,
  questionId: string,
  optionId: string,
  voterId: string,
  voterName?: string,
  isAnonymous = false
): Promise<{ success: boolean; message?: string; alreadyVoted?: boolean; totalVotes?: number }> {
  const room = await getPollRoom(roomCode)
  if (!room) return { success: false, message: 'Room not found' }

  if (room.status !== 'LIVE') {
    return {
      success: false,
      message: room.status === 'READY'
        ? 'Voting is in Ready mode. Waiting for host to open voting.'
        : room.status === 'STOPPED'
        ? 'Voting has ended for this category.'
        : room.status === 'COMPLETED'
        ? 'Voting for this category is now closed.'
        : 'Poll is in Draft mode.',
    }
  }

  const q = room.questions.find(item => item.id === questionId)
  if (!q) return { success: false, message: 'Question not found' }

  const option = q.options.find(o => o.id === optionId)
  if (!option) return { success: false, message: 'Option not found' }

  // Check if voter already voted for this question
  const existingVote = room.votes.find(v => v.questionId === questionId && v.voterId === voterId)
  if (existingVote) {
    return {
      success: true,
      alreadyVoted: true,
      message: 'You have already voted in this category!',
      totalVotes: q.totalVotes,
    }
  }

  const now = Date.now()
  const cleanName = isAnonymous ? 'Anonymous Voter' : (voterName || 'Anonymous Voter').trim()
  const voteId = `vote_${room.id}_${questionId}_${voterId}`

  const vote: PollVote = {
    id: voteId,
    roomCode: room.id,
    questionId,
    optionId,
    voterId,
    voterName: cleanName,
    isAnonymous,
    votedAt: now,
  }

  room.votes.push(vote)
  option.votesCount += 1
  q.totalVotes += 1
  room.updatedAt = now

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO poll_votes (id, room_code, question_id, option_id, voter_id, voter_name, is_anonymous, voted_at)
       VALUES ('${voteId}', '${room.id}', '${questionId}', '${optionId}', '${voterId}', '${cleanName.replace(/'/g, "''")}', ${isAnonymous ? 1 : 0}, ${now})`
    )
  } catch (err) {
    console.warn('Notice: castVote DB write:', err)
  }

  return {
    success: true,
    totalVotes: q.totalVotes,
  }
}

export async function resetQuestionVotes(
  roomCode: string,
  hostKey: string,
  questionId?: string
): Promise<PollRoom | null> {
  const room = await getPollRoom(roomCode)
  if (!room || room.hostKey !== hostKey) return null

  const targetQ = questionId
    ? room.questions.find(q => q.id === questionId)
    : room.questions[room.activeQuestionIndex]

  if (!targetQ) return null

  // Clear votes for this question
  room.votes = room.votes.filter(v => v.questionId !== targetQ.id)
  targetQ.options.forEach(o => {
    o.votesCount = 0
  })
  targetQ.totalVotes = 0
  targetQ.winnerOptionId = null
  room.status = 'READY'
  room.updatedAt = Date.now()

  rooms.set(room.id, room)

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM poll_votes WHERE room_code = '${room.id}' AND question_id = '${targetQ.id}'`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE poll_rooms SET status = 'READY', updated_at = ${room.updatedAt} WHERE id = '${room.id}'`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE poll_questions SET winner_option_id = NULL WHERE id = '${targetQ.id}'`
    )
  } catch (err) {
    console.warn('Notice: resetQuestionVotes DB write:', err)
  }

  return room
}
