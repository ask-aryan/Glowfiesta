import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const username = process.argv[2]
  const password = process.argv[3]

  if (!username || !password) {
    console.error('Usage: npx ts-node scripts/create-admin.ts <username> <password>')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash: hash,
      role: 'ORGANIZER',
      isActive: true,
    },
    create: {
      username,
      passwordHash: hash,
      role: 'ORGANIZER',
      isActive: true,
    },
  })

  console.log(`✓ Admin user successfully created/updated: "${user.username}"`)
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
