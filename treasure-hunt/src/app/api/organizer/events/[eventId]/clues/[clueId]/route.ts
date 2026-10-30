import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; clueId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const clueId = parseInt(params.clueId)
  if (isNaN(clueId)) return NextResponse.json({ error: 'Invalid clue ID' }, { status: 400 })

  const body = await req.json()
  const { clueText, hintText } = body as { clueText?: string; hintText?: string }

  const updated = await prisma.clue.update({
    where: { id: clueId },
    data: {
      ...(clueText !== undefined && { clueText }),
      ...(hintText !== undefined && { hintText }),
    },
    include: { team: { select: { id: true, teamName: true } } },
  })

  return NextResponse.json({ clue: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string; clueId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const clueId = parseInt(params.clueId)
  if (isNaN(clueId)) return NextResponse.json({ error: 'Invalid clue ID' }, { status: 400 })

  await prisma.qrCode.deleteMany({ where: { clueId } })
  await prisma.clue.delete({ where: { id: clueId } })

  return NextResponse.json({ ok: true })
}
