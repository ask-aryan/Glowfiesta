import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const prismaDir = path.join(projectRoot, 'prisma')

const target = process.argv[2]?.toLowerCase()

if (!target || (target !== 'supabase' && target !== 'postgres' && target !== 'mysql')) {
  console.log('Usage: node scripts/switch-db.mjs [supabase|mysql]')
  process.exit(1)
}

const targetSchema = (target === 'supabase' || target === 'postgres')
  ? path.join(prismaDir, 'schema.postgresql.prisma')
  : path.join(prismaDir, 'schema.mysql.prisma')

const activeSchema = path.join(prismaDir, 'schema.prisma')

if (!fs.existsSync(targetSchema)) {
  console.error(`Target schema does not exist: ${targetSchema}`)
  process.exit(1)
}

fs.copyFileSync(targetSchema, activeSchema)
console.log(`✓ Active schema switched to: ${target.toUpperCase()}`)

try {
  console.log('Generating Prisma client...')
  execSync('npx prisma generate', { cwd: projectRoot, stdio: 'inherit' })
  console.log('✓ Prisma client generated successfully!')
} catch (e) {
  console.warn('Note: Prisma generate finished (or engine was in use).')
}
