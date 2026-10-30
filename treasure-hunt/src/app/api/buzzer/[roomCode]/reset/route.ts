import { NextRequest, NextResponse } from 'next/server'
import { resetRoomBuzzers, BuzzerStatus } from '@/lib/buzzer'

export async function POST(
  req: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, nextStatus } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Host key required' }, { status: 401 })
    }

    const targetStatus: BuzzerStatus = ['DRAFT', 'READY', 'LIVE'].includes(nextStatus)
      ? nextStatus
      : 'READY'

    const room = await resetRoomBuzzers(params.roomCode, hostKey, targetStatus)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      roundNumber: room.roundNumber,
      status: room.status,
      message: 'All buzzers reset successfully',
    })
  } catch (err: any) {
    console.error('Error resetting buzzers:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
