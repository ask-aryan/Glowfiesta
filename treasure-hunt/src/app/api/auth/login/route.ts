import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sessionOptions, SessionData } from '@/lib/session'
import { loginSchema } from '@/lib/validation/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { username, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { username } })

  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  session.userId = user.id
  session.role = user.role as 'ORGANIZER' | 'TEAM'
  session.username = user.username

  if (user.role === 'TEAM') {
    const team = await prisma.team.findFirst({ where: { userId: user.id } })
    if (team) session.teamId = team.id
  }

  await session.save()
  return NextResponse.json({ role: user.role, username: user.username })
}
