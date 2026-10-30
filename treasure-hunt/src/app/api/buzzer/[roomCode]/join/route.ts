import { NextRequest, NextResponse } from 'next/server'
import { joinParticipant } from '@/lib/buzzer'

export async function POST(
  req: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const teamName = (body.teamName || '').trim()

    if (!teamName) {
      return NextResponse.json({ success: false, message: 'Please enter a team name' }, { status: 400 })
    }

    const participant = await joinParticipant(params.roomCode, teamName)
    if (!participant) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      participant: {
        teamName: participant.teamName,
        joinedAt: participant.joinedAt,
      },
    })
  } catch (err: any) {
    console.error('Error joining buzzer room:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
