import { NextRequest, NextResponse } from 'next/server'
import { createPollRoom } from '@/lib/poll'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title : undefined

    const room = await createPollRoom(title)

    return NextResponse.json({
      success: true,
      roomCode: room.id,
      title: room.title,
      hostKey: room.hostKey,
      status: room.status,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error creating poll room:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
