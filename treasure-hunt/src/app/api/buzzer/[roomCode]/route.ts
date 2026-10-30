import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/buzzer'

export async function GET(
  req: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const room = await getRoom(params.roomCode)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const hostKey = searchParams.get('hostKey')
    const teamName = searchParams.get('teamName')?.trim()

    const isHost = Boolean(hostKey && hostKey === room.hostKey)

    // Format buzzes with delta times
    const formattedBuzzes = room.presses.map((p, idx) => ({
      rank: idx + 1,
      teamName: p.teamName,
      buzzedAtMs: p.buzzedAtMs,
      deltaMs: p.deltaMs,
      formattedTime: idx === 0 ? '0.000s' : `+${(p.deltaMs / 1000).toFixed(3)}s`,
    }))

    const participantsList = Array.from(room.participants.values()).map(p => ({
      teamName: p.teamName,
      joinedAt: p.joinedAt,
    }))

    const myBuzz = teamName
      ? formattedBuzzes.find(b => b.teamName.toLowerCase() === teamName.toLowerCase()) || null
      : null

    return NextResponse.json({
      success: true,
      roomCode: room.id,
      name: room.name,
      status: room.status,
      roundNumber: room.roundNumber,
      liveAt: room.liveAt,
      firstBuzzAt: room.firstBuzzAt,
      isHost,
      participants: participantsList,
      buzzes: formattedBuzzes,
      myBuzz,
      serverTime: Date.now(),
    })
  } catch (err: any) {
    console.error('Error fetching buzzer room:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
