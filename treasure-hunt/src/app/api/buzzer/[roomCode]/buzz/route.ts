import { NextRequest, NextResponse } from 'next/server'
import { recordBuzz } from '@/lib/buzzer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const teamName = (body.teamName || '').trim()
    const clientTimeMs = body.clientTimeMs ? Number(body.clientTimeMs) : undefined

    if (!teamName) {
      return NextResponse.json({ success: false, message: 'Team name is required' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const result = await recordBuzz(params.roomCode, teamName, clientTimeMs)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message || 'Buzz failed' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json({
      success: true,
      alreadyBuzzed: Boolean(result.alreadyBuzzed),
      rank: result.rank,
      press: result.press,
      message: result.message,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error recording buzz:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
