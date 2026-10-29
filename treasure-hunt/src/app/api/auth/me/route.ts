import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  return NextResponse.json({ userId: session.userId, role: session.role, username: session.username, teamId: session.teamId })
}
