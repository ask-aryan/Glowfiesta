import { NextRequest, NextResponse } from 'next/server'
import { createRoom } from '@/lib/buzzer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const room = await createRoom(body.name)
    return NextResponse.json({
      success: true,
      roomCode: room.id,
      name: room.name,
      hostKey: room.hostKey,
      status: room.status,
    })
  } catch (err: any) {
    console.error('Error creating buzzer room:', err)
    return NextResponse.json({ success: false, message: 'Failed to create room' }, { status: 500 })
  }
}
