import { NextRequest, NextResponse } from 'next/server'
import { updateRoomStatus, BuzzerStatus } from '@/lib/buzzer'

export async function POST(
  req: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, status } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Host key required' }, { status: 401 })
    }

    if (!['DRAFT', 'READY', 'LIVE'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
    }

    const room = await updateRoomStatus(params.roomCode, hostKey, status as BuzzerStatus)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      status: room.status,
      liveAt: room.liveAt,
      roundNumber: room.roundNumber,
    })
  } catch (err: any) {
    console.error('Error updating buzzer room status:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
