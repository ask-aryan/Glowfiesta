import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { getMascotById } from '@/lib/mascot'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  try {
    const mascot = await getMascotById(params.id)
    if (!mascot || !mascot.fileData) {
      return NextResponse.json({ error: 'Mascot file not found' }, { status: 404 })
    }

    const fileBuffer = Buffer.from(mascot.fileData, 'base64')
    const fileName = encodeURIComponent(mascot.fileName || 'artverse_mascot')

    const isDownload = req.nextUrl.searchParams.get('download') === '1'
    const isImageOrPdf = mascot.fileType?.startsWith('image/') || mascot.fileType === 'application/pdf'
    const dispositionType = (isDownload || !isImageOrPdf) ? 'attachment' : 'inline'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mascot.fileType || 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${fileName}"; filename*=UTF-8''${fileName}`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
