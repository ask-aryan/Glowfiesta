import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const prismaDir = path.join(projectRoot, 'prisma')

const dbUrl = (process.env.DATABASE_URL || '').trim().toLowerCase()
const isMysql = dbUrl.startsWith('mysql://')

const targetSchema = isMysql
  ? path.join(prismaDir, 'schema.mysql.prisma')
  : path.join(prismaDir, 'schema.postgresql.prisma')

const activeSchema = path.join(prismaDir, 'schema.prisma')

if (fs.existsSync(targetSchema)) {
  fs.copyFileSync(targetSchema, activeSchema)
  console.log(`✓ Synchronized Prisma schema to: ${isMysql ? 'MYSQL' : 'POSTGRESQL (Supabase)'}`)
} else {
  console.warn(`Target schema file not found: ${targetSchema}`)
}
