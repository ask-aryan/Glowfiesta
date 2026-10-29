import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
await prisma.scanHistory.deleteMany({})
await prisma.qrCode.deleteMany({})
await prisma.clue.deleteMany({})
console.log('Cleared scan history, QR codes, and clues')
await prisma.$disconnect()
