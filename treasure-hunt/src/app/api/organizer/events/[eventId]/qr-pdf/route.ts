import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateQrDataUrl, buildScanUrl } from '@/lib/qr'
import PDFDocument from 'pdfkit'
import { PassThrough } from 'stream'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const requestBaseUrl = host ? `${proto}://${host}` : undefined

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const qrCodes = await prisma.qrCode.findMany({
    where: { eventId, isActive: true },
    include: { assignedTeam: true },
    orderBy: [{ qrType: 'asc' }, { assignedTeamId: 'asc' }, { stageNumber: 'asc' }],
  })

  if (qrCodes.length === 0) {
    return NextResponse.json({ error: 'No QR codes found. Generate them first.' }, { status: 400 })
  }

  // Build PDF — 3x3 Grid (9 cards per A4 page)
  const margin = 18
  const doc = new PDFDocument({ size: 'A4', margin })
  const passThrough = new PassThrough()
  const chunks: Buffer[] = []

  passThrough.on('data', (chunk: Buffer) => chunks.push(chunk))
  doc.pipe(passThrough)

  const cardsPerPage = 9
  const cols = 3
  const rows = 3
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const cardWidth = (pageWidth - margin * 2) / cols
  const cardHeight = (pageHeight - margin * 2) / rows

  for (let i = 0; i < qrCodes.length; i++) {
    const qr = qrCodes[i]
    const posOnPage = i % cardsPerPage
    if (i > 0 && posOnPage === 0) doc.addPage()

    const col = posOnPage % cols
    const row = Math.floor(posOnPage / cols)
    const x = margin + col * cardWidth
    const y = margin + row * cardHeight

    // Card border with gentle rounded corners
    doc
      .roundedRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4, 5)
      .lineWidth(0.75)
      .strokeColor('#555555')
      .stroke()

    const isFunDiwali =
      qr.tokenHash.startsWith('fun_diwali_') ||
      (qr.assignedTeamId === null && qr.stageNumber === null && qr.qrType === 'TEAM_STAGE')
    const teamName = isFunDiwali
      ? 'FUN DUMMY DECOY'
      : qr.qrType === 'COMMON_FINAL'
      ? 'COMMON FINAL'
      : (qr.assignedTeam?.teamName ?? 'Unknown Team')

    const stageLabel = isFunDiwali
      ? 'Happy Diwali Surprise'
      : qr.qrType === 'COMMON_FINAL'
      ? 'Final Clue'
      : `Stage ${qr.stageNumber}`

    // Team name header
    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(teamName, x + 6, y + 8, { width: cardWidth - 12, align: 'center', ellipsis: true })

    // Stage label
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(stageLabel, x + 6, y + 21, { width: cardWidth - 12, align: 'center', ellipsis: true })

    // Display number (organizer reference)
    const isCodeMode = event.clueMode === 'CODE'
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`${isCodeMode ? 'CODE' : 'QR'} #${qr.displayNumber}`, x + 6, y + 32, { width: cardWidth - 12, align: 'center' })

    if (isCodeMode) {
      const boxWidth = cardWidth - 20
      const boxHeight = 90
      const boxX = x + 10
      const boxY = y + 50

      // Background rounded passcode badge
      doc
        .roundedRect(boxX, boxY, boxWidth, boxHeight, 8)
        .lineWidth(1.2)
        .fillAndStroke(isFunDiwali ? '#FEF3C7' : '#FFF7ED', isFunDiwali ? '#F59E0B' : '#FF6B35')

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(isFunDiwali ? '#B45309' : '#C2410C')
        .text(isFunDiwali ? 'SURPRISE PASSCODE' : 'CLUE PASSCODE', boxX, boxY + 14, { width: boxWidth, align: 'center' })

      doc
        .fontSize(28)
        .font('Courier-Bold')
        .fillColor('#111827')
        .text(qr.tokenHash, boxX, boxY + 32, { width: boxWidth, align: 'center', characterSpacing: 4 })

      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(isFunDiwali ? '#B45309' : '#9A3412')
        .text(isFunDiwali ? 'Festive Diwali Decoy Code' : 'Enter 6-char code in your team dashboard', x + 6, boxY + boxHeight + 14, {
          width: cardWidth - 12,
          align: 'center',
        })
    } else {
      // Generate QR image — encode tokenHash in the URL
      try {
        const scanUrl = buildScanUrl(qr.tokenHash, requestBaseUrl)
        const dataUrl = await generateQrDataUrl(scanUrl)
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
        const imgBuffer = Buffer.from(base64Data, 'base64')

        const qrSize = Math.min(cardWidth - 30, 132)
        const qrX = x + (cardWidth - qrSize) / 2
        const qrY = y + 40

        doc.image(imgBuffer, qrX, qrY, { width: qrSize, height: qrSize })

        // Fallback Passcode Box printed directly on every QR card
        const isShortCode = qr.tokenHash.length <= 8
        if (isShortCode) {
          const codeBoxWidth = cardWidth - 28
          const codeBoxHeight = 28
          const codeBoxX = x + 14
          const codeBoxY = qrY + qrSize + 4

          doc
            .roundedRect(codeBoxX, codeBoxY, codeBoxWidth, codeBoxHeight, 6)
            .lineWidth(0.9)
            .fillAndStroke(isFunDiwali ? '#FEF3C7' : '#FFF7ED', isFunDiwali ? '#F59E0B' : '#FF6B35')

          doc
            .fontSize(6.5)
            .font('Helvetica-Bold')
            .fillColor(isFunDiwali ? '#B45309' : '#C2410C')
            .text(isFunDiwali ? 'DECOY CODE:' : 'CLUE PASSCODE:', codeBoxX, codeBoxY + 5, { width: codeBoxWidth, align: 'center' })

          doc
            .fontSize(13)
            .font('Courier-Bold')
            .fillColor('#111827')
            .text(qr.tokenHash, codeBoxX, codeBoxY + 13, { width: codeBoxWidth, align: 'center', characterSpacing: 2.5 })

          doc
            .fontSize(6)
            .font('Helvetica')
            .fillColor('#64748b')
            .text('Scan QR or enter 6-char code in app', x + 6, codeBoxY + codeBoxHeight + 5, {
              width: cardWidth - 12,
              align: 'center',
            })
        } else {
          doc
            .fontSize(6)
            .font('Helvetica')
            .fillColor('#9ca3af')
            .text('Scan with GlowFiesta Camera', x + 6, qrY + qrSize + 4, {
              width: cardWidth - 12,
              align: 'center',
            })
        }
      } catch (err) {
        console.warn('Notice: PDF QR image generation error:', err)
      }
    }
  }

  doc.end()

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    passThrough.on('end', () => resolve(Buffer.concat(chunks)))
    passThrough.on('error', reject)
  })

  return new NextResponse(pdfBuffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${event.clueMode === 'CODE' ? 'clue-codes' : 'qr-codes'}-3x3-${event.name.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
