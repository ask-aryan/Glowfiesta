const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const newUsername = 'gf_superadmin_2026'
  const newPassword = 'GF#Secure!7890#Diwali'

  const hash = await bcrypt.hash(newPassword, 12)
  console.log('--- BCRYPT HASH ---')
  console.log(hash)
  console.log('Verify check:', await bcrypt.compare(newPassword, hash))

  console.log('\n--- SUPABASE / POSTGRESQL & MYSQL SQL STATEMENT ---')
  console.log(`UPDATE users SET username = '${newUsername}', password_hash = '${hash}', role = 'ORGANIZER', is_active = true WHERE id = 1;`)

  try {
    const existing = await prisma.user.findUnique({ where: { id: 1 } })
    console.log('\nExisting user with id 1 in connected DB:', existing)

    const updated = await prisma.user.upsert({
      where: { id: 1 },
      update: {
        username: newUsername,
        passwordHash: hash,
        role: 'ORGANIZER',
        isActive: true,
      },
      create: {
        id: 1,
        username: newUsername,
        passwordHash: hash,
        role: 'ORGANIZER',
        isActive: true,
      },
    })
    console.log('\n✓ Database successfully updated user with id 1:', updated)
  } catch (err) {
    console.warn('Prisma DB update notice:', err)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
