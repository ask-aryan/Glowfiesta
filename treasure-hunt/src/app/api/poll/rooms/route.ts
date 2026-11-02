import { NextRequest, NextResponse } from 'next/server'
import { createPollRoom } from '@/lib/poll'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const room = await createPollRoom(body.title)
    return NextResponse.json({
      success: true,
      roomCode: room.id,
      title: room.title,
      hostKey: room.hostKey,
      status: room.status,
    })
  } catch (err: any) {
    console.error('Error creating poll room:', err)
    return NextResponse.json({ success: false, message: 'Failed to create poll room' }, { status: 500 })
  }
}
