import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { setDeclaredWinner, clearDeclaredWinner, getDeclaredWinner } from '@/lib/declaredWinner'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  const winner = await getDeclaredWinner(eventId)
  return NextResponse.json({ success: true, declaredWinner: winner }, { headers: NO_CACHE_HEADERS })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  const eventId = parseInt(params.eventId)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })

  try {
    const body = await req.json().catch(() => ({}))
    const { teamId, action } = body

    if (action === 'clear') {
      await clearDeclaredWinner(eventId)
      return NextResponse.json({ success: true, message: 'Winner declaration cleared', declaredWinner: null }, { headers: NO_CACHE_HEADERS })
    }

    if (!teamId || isNaN(Number(teamId))) {
      return NextResponse.json({ error: 'Valid team ID is required to declare winner' }, { status: 400 })
    }

    const winner = await setDeclaredWinner(eventId, Number(teamId))
    if (!winner) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Team "${winner.teamName}" declared as Winner! 🏆`,
      declaredWinner: winner,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error declaring winner:', err)
    return NextResponse.json({ error: 'Failed to declare winner' }, { status: 500 })
  }
}
