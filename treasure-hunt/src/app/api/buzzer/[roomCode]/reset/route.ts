import { NextRequest, NextResponse } from 'next/server'
import { resetRoomBuzzers, BuzzerStatus } from '@/lib/buzzer'

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
    const { hostKey, nextStatus } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Host key required' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    const targetStatus: BuzzerStatus = ['DRAFT', 'READY', 'LIVE'].includes(nextStatus)
      ? nextStatus
      : 'READY'

    const room = await resetRoomBuzzers(params.roomCode, hostKey, targetStatus)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json({
      success: true,
      roundNumber: room.roundNumber,
      status: room.status,
      updatedAt: room.updatedAt,
      message: 'All buzzers reset successfully',
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error resetting buzzers:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
