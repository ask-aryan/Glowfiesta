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
  const addDummy = body?.addDummy === true

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { teams: true, clues: true },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Support adding a single extra Dummy Diwali QR anytime
  if (addDummy) {
    const existingQrs = await prisma.qrCode.findMany({
      where: { eventId },
      orderBy: { displayNumber: 'desc' },
      take: 1,
    })
    const maxDisplay = (existingQrs[0]?.displayNumber ?? 0) + 1
    const repClue = event.clues[0]
    if (!repClue) return NextResponse.json({ error: 'Add at least one clue before generating QR' }, { status: 400 })

    const token = `fun_diwali_${generateToken().substring(0, 36)}`
    await prisma.qrCode.create({
      data: {
        eventId,
        clueId: repClue.id,
        qrType: 'TEAM_STAGE',
        assignedTeamId: null,
        stageNumber: null,
        displayNumber: maxDisplay,
        tokenHash: token,
      },
    })
    return NextResponse.json({ created: 1, isDummy: true })
  }

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

  // Get unique stage numbers (one QR per stage per team)
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

  // 1. One QR per stage per team
  for (const team of event.teams) {
    for (const stageNum of stageNumbers) {
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

  // 2. Common final QR (one shared for all teams)
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

  // 3. Fun Dummy Diwali QRs (Decoys)
  // Automatically generate 3 festive Diwali dummy QRs for fun surprises!
  const repClue = stageClues[0] || commonFinalClue || event.clues[0]
  if (repClue) {
    for (let d = 1; d <= 3; d++) {
      const token = `fun_diwali_${generateToken().substring(0, 36)}`
      qrCodeData.push({
        eventId,
        clueId: repClue.id,
        qrType: 'TEAM_STAGE',
        assignedTeamId: null,
        stageNumber: null,
        displayNumber: displayCounter++,
        tokenHash: token,
      })
    }
  }

  await prisma.qrCode.createMany({ data: qrCodeData })

  return NextResponse.json({ created: qrCodeData.length })
}
