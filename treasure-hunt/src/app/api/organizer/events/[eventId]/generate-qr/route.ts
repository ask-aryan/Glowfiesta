import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/qr'

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const force = body?.force === true

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { teams: true, clues: true },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const existingCount = await prisma.qrCode.count({ where: { eventId } })
  if (existingCount > 0 && !force) {
    return NextResponse.json({ error: 'QR codes already generated' }, { status: 400 })
  }

  // Delete existing QR codes when force-regenerating
  if (existingCount > 0 && force) {
    await prisma.qrCode.deleteMany({ where: { eventId } })
  }

  const stageClues = event.clues.filter(c => !c.isCommonFinal)
  const commonFinalClue = event.clues.find(c => c.isCommonFinal)

  // Get unique stage numbers (one QR per stage per team, not one per clue)
  const stageNumberSet = new Set(
    stageClues.map(c => c.stageNumber).filter((n): n is number => n !== null)
  )
  const stageNumbers = Array.from(stageNumberSet).sort((a, b) => a - b)

  const qrCodeData: {
    eventId: number
    clueId: number
    qrType: 'TEAM_STAGE' | 'COMMON_FINAL'
    assignedTeamId: number | null
    stageNumber: number | null
    displayNumber: number
    tokenHash: string
  }[] = []

  let displayCounter = 1

  // One QR per stage per team
  for (const team of event.teams) {
    for (const stageNum of stageNumbers) {
      // Pick the first clue for this stage (clueId FK is required by schema)
      const representativeClue = stageClues.find(c => c.stageNumber === stageNum)!
      const token = generateToken()
      const tokenHash = hashToken(token)
      qrCodeData.push({
        eventId,
        clueId: representativeClue.id,
        qrType: 'TEAM_STAGE',
        assignedTeamId: team.id,
        stageNumber: stageNum,
        displayNumber: displayCounter++,
        tokenHash,
      })
    }
  }

  // Common final QR (one shared for all teams)
  if (event.hasCommonFinalQr && commonFinalClue) {
    const token = generateToken()
    const tokenHash = hashToken(token)
    qrCodeData.push({
      eventId,
      clueId: commonFinalClue.id,
      qrType: 'COMMON_FINAL',
      assignedTeamId: null,
      stageNumber: null,
      displayNumber: displayCounter++,
      tokenHash,
    })
  }

  await prisma.qrCode.createMany({ data: qrCodeData })

  return NextResponse.json({ created: qrCodeData.length })
}
