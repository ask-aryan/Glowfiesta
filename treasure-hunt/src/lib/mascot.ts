import { prisma } from './db'
import fs from 'fs'
import path from 'path'

export interface MascotSubmission {
  id: string
  employeeName: string
  title: string
  thoughtBehind: string
  fileName: string
  fileSize: number
  fileType: string
  fileData?: string // base64 encoded file content
  submittedAt: number // timestamp ms
}

// In-memory + disk cache fallback in case DB is unreachable
const memoryMascots: MascotSubmission[] = []
const BACKUP_DIR = path.join(process.cwd(), '.data', 'mascots')

function ensureBackupDir() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
  } catch {}
}

/**
 * Ensure the SQL table exists across PostgreSQL and MySQL.
 */
export async function ensureMascotTable() {
  // First attempt: MySQL LONGTEXT syntax
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS mascot_submissions (
        id VARCHAR(64) PRIMARY KEY,
        employee_name VARCHAR(150) NOT NULL,
        title VARCHAR(200) NOT NULL,
        thought_behind TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_data LONGTEXT NOT NULL,
        submitted_at BIGINT NOT NULL
      )
    `)
    return
  } catch {
    // Second attempt: PostgreSQL TEXT syntax
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS mascot_submissions (
          id VARCHAR(64) PRIMARY KEY,
          employee_name VARCHAR(150) NOT NULL,
          title VARCHAR(200) NOT NULL,
          thought_behind TEXT NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size INT NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_data TEXT NOT NULL,
          submitted_at BIGINT NOT NULL
        )
      `)
    } catch (e) {
      console.warn('Notice: SQL table check for mascot_submissions:', e)
    }
  }
}

/**
 * Save a new 3D mascot submission into SQL (with backup).
 */
export async function saveMascotSubmission(sub: MascotSubmission): Promise<boolean> {
  // 1. Keep in-memory cache
  const existingIdx = memoryMascots.findIndex(m => m.id === sub.id)
  if (existingIdx >= 0) {
    memoryMascots[existingIdx] = sub
  } else {
    memoryMascots.unshift(sub)
  }

  // 2. Write to backup file system so data is never lost
  try {
    ensureBackupDir()
    const filePath = path.join(BACKUP_DIR, `${sub.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(sub), 'utf8')
  } catch (err) {
    console.warn('Notice: Local disk backup failed (serverless environment):', err)
  }

  // 3. Persist to SQL Database
  try {
    await ensureMascotTable()

    // Escape single quotes for SQL safety
    const safeId = sub.id.replace(/'/g, "''")
    const safeName = sub.employeeName.replace(/'/g, "''")
    const safeTitle = sub.title.replace(/'/g, "''")
    const safeThought = sub.thoughtBehind.replace(/'/g, "''")
    const safeFileName = sub.fileName.replace(/'/g, "''")
    const safeFileType = sub.fileType.replace(/'/g, "''")
    const safeData = (sub.fileData || '').replace(/'/g, "''")

    await prisma.$executeRawUnsafe(`
      INSERT INTO mascot_submissions
      (id, employee_name, title, thought_behind, file_name, file_size, file_type, file_data, submitted_at)
      VALUES
      ('${safeId}', '${safeName}', '${safeTitle}', '${safeThought}', '${safeFileName}', ${sub.fileSize}, '${safeFileType}', '${safeData}', ${sub.submittedAt})
    `)

    return true
  } catch (dbErr) {
    console.error('Database write for mascot failed, kept in cache:', dbErr)
    return true // Still succeeded via memory/disk fallback
  }
}

/**
 * Retrieve all mascot submissions metadata (without heavy fileData payload).
 */
export async function getMascotSubmissions(): Promise<Omit<MascotSubmission, 'fileData'>[]> {
  try {
    await ensureMascotTable()
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, employee_name, title, thought_behind, file_name, file_size, file_type, submitted_at
      FROM mascot_submissions
      ORDER BY submitted_at DESC
    `)

    if (rows && rows.length > 0) {
      return rows.map(r => ({
        id: String(r.id),
        employeeName: String(r.employee_name ?? r.employeeName ?? ''),
        title: String(r.title ?? ''),
        thoughtBehind: String(r.thought_behind ?? r.thoughtBehind ?? ''),
        fileName: String(r.file_name ?? r.fileName ?? ''),
        fileSize: Number(r.file_size ?? r.fileSize ?? 0),
        fileType: String(r.file_type ?? r.fileType ?? 'model/stl'),
        submittedAt: Number(r.submitted_at ?? r.submittedAt ?? Date.now()),
      }))
    }
  } catch (err) {
    console.warn('Notice: Loading mascots from DB failed, checking backup:', err)
  }

  // Fallback: read from disk backup
  try {
    ensureBackupDir()
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'))
    const list: Omit<MascotSubmission, 'fileData'>[] = []
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8')
        const item: MascotSubmission = JSON.parse(raw)
        list.push({
          id: item.id,
          employeeName: item.employeeName,
          title: item.title,
          thoughtBehind: item.thoughtBehind,
          fileName: item.fileName,
          fileSize: item.fileSize,
          fileType: item.fileType,
          submittedAt: item.submittedAt,
        })
      } catch {}
    }
    if (list.length > 0) {
      list.sort((a, b) => b.submittedAt - a.submittedAt)
      return list
    }
  } catch {}

  // Final fallback: memory cache
  return memoryMascots.map(({ fileData: _, ...rest }) => rest)
}

/**
 * Retrieve full mascot submission by ID (including fileData).
 */
export async function getMascotById(id: string): Promise<MascotSubmission | null> {
  const cleanId = id.trim()
  try {
    await ensureMascotTable()
    const safeId = cleanId.replace(/'/g, "''")
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, employee_name, title, thought_behind, file_name, file_size, file_type, file_data, submitted_at
      FROM mascot_submissions
      WHERE id = '${safeId}'
      LIMIT 1
    `)

    if (rows && rows.length > 0) {
      const r = rows[0]
      return {
        id: String(r.id),
        employeeName: String(r.employee_name ?? r.employeeName ?? ''),
        title: String(r.title ?? ''),
        thoughtBehind: String(r.thought_behind ?? r.thoughtBehind ?? ''),
        fileName: String(r.file_name ?? r.fileName ?? ''),
        fileSize: Number(r.file_size ?? r.fileSize ?? 0),
        fileType: String(r.file_type ?? r.fileType ?? 'model/stl'),
        fileData: String(r.file_data ?? r.fileData ?? ''),
        submittedAt: Number(r.submitted_at ?? r.submittedAt ?? Date.now()),
      }
    }
  } catch (err) {
    console.warn('Notice: Loading mascot by ID from DB failed, checking backup:', err)
  }

  // Fallback: disk
  try {
    ensureBackupDir()
    const filePath = path.join(BACKUP_DIR, `${cleanId}.json`)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(raw)
    }
  } catch {}

  // Fallback: memory
  const found = memoryMascots.find(m => m.id === cleanId)
  return found ?? null
}

/**
 * Delete a mascot submission.
 */
export async function deleteMascotSubmission(id: string): Promise<boolean> {
  const cleanId = id.trim()
  try {
    await ensureMascotTable()
    const safeId = cleanId.replace(/'/g, "''")
    await prisma.$executeRawUnsafe(`
      DELETE FROM mascot_submissions WHERE id = '${safeId}'
    `)
  } catch (err) {
    console.warn('Notice: Deleting mascot from DB:', err)
  }

  // Disk delete
  try {
    ensureBackupDir()
    const filePath = path.join(BACKUP_DIR, `${cleanId}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {}

  // Memory delete
  const idx = memoryMascots.findIndex(m => m.id === cleanId)
  if (idx >= 0) {
    memoryMascots.splice(idx, 1)
  }

  return true
}
