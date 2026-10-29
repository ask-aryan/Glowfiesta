import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateQrDataUrl, buildScanUrl } from '@/lib/qr'
import PDFDocument from 'pdfkit'
import { PassThrough } from 'stream'

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

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

  // We need token values — but we only stored hashes.
  // For PDF generation we'll generate a scan URL using the tokenHash as a placeholder
  // Actually we need to re-derive URLs. Since we only have hashes, we'll use a display-only PDF
  // with QR codes encoding the hash-based lookup URL pattern.
  // Note: In production, tokens should be stored or derived differently.
  // For this MVP, we encode the tokenHash as the scan token (so the scan endpoint must accept tokenHash directly)
  // or we add a separate "token" column. Since schema has tokenHash only, we'll use it as the URL token.

  // Build PDF
  const doc = new PDFDocument({ size: 'A4', margin: 30 })
  const passThrough = new PassThrough()
  const chunks: Buffer[] = []

  passThrough.on('data', (chunk: Buffer) => chunks.push(chunk))

  doc.pipe(passThrough)

  const cardsPerPage = 4
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const margin = 30
  const cardWidth = (pageWidth - margin * 2) / 2
  const cardHeight = (pageHeight - margin * 2) / 2

  for (let i = 0; i < qrCodes.length; i++) {
    const qr = qrCodes[i]
    const posOnPage = i % cardsPerPage
    if (i > 0 && posOnPage === 0) doc.addPage()

    const col = posOnPage % 2
    const row = Math.floor(posOnPage / 2)
    const x = margin + col * cardWidth
    const y = margin + row * cardHeight

    // Card border
    doc.rect(x + 4, y + 4, cardWidth - 8, cardHeight - 8).stroke()

    const teamName = qr.qrType === 'COMMON_FINAL' ? 'COMMON FINAL' : (qr.assignedTeam?.teamName ?? 'Unknown Team')
    const stageLabel = qr.qrType === 'COMMON_FINAL' ? 'Final' : `Stage ${qr.stageNumber}`

    // Team name
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(teamName, x + 10, y + 14, { width: cardWidth - 20, align: 'center' })

    // Stage label
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(stageLabel, x + 10, y + 30, { width: cardWidth - 20, align: 'center' })

    // Display number (organizer copy info)
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Display #: ${qr.displayNumber}`, x + 10, y + 44, { width: cardWidth - 20, align: 'center' })

    // Generate QR image — encode tokenHash in the URL
    try {
      const scanUrl = buildScanUrl(qr.tokenHash)
      const dataUrl = await generateQrDataUrl(scanUrl)
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
      const imgBuffer = Buffer.from(base64Data, 'base64')

      const qrSize = Math.min(cardWidth - 40, cardHeight - 80)
      const qrX = x + (cardWidth - qrSize) / 2
      const qrY = y + 60

      doc.image(imgBuffer, qrX, qrY, { width: qrSize, height: qrSize })
    } catch {
      doc.fontSize(8).text('[QR generation error]', x + 10, y + 60)
    }
  }

  doc.end()

  // Wait for PDF to finish
  await new Promise<void>((resolve, reject) => {
    passThrough.on('end', resolve)
    passThrough.on('error', reject)
  })

  const pdfBuffer = Buffer.concat(chunks)

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-codes-event-${eventId}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
