import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const session = await getSession()
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }

  if (!session.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noCacheHeaders })
  }
  return NextResponse.json(
    { userId: session.userId, role: session.role, username: session.username, teamId: session.teamId },
    { headers: noCacheHeaders }
  )
}
