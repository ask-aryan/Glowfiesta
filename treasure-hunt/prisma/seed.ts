import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 12)
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hash,
      role: 'ORGANIZER',
      isActive: true,
    },
  })
  console.log('Organizer created:', user.username)
}

main().catch(console.error).finally(() => prisma.$disconnect())
