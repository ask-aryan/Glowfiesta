import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const teamId = parseInt(params.teamId)
  if (isNaN(teamId)) return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })

  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { user: true } })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const body = await req.json()
  const { teamName, password } = body as { teamName?: string; password?: string }

  await prisma.$transaction(async (tx) => {
    if (teamName && teamName !== team.teamName) {
      await tx.team.update({ where: { id: teamId }, data: { teamName } })
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      await tx.team.update({ where: { id: teamId }, data: { plainPassword: password } })
      await tx.user.update({ where: { id: team.userId }, data: { passwordHash } })
    }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string; teamId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const teamId = parseInt(params.teamId)
  if (isNaN(teamId)) return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.scanHistory.deleteMany({ where: { teamId } })
    await tx.teamStageProgress.deleteMany({ where: { teamId } })
    await tx.qrCode.deleteMany({ where: { assignedTeamId: teamId } })
    await tx.team.delete({ where: { id: teamId } })
    await tx.user.delete({ where: { id: team.userId } })
  })

  return NextResponse.json({ ok: true })
}
