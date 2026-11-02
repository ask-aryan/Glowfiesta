import { NextRequest, NextResponse } from 'next/server'
import { resetQuestionVotes } from '@/lib/poll'

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, questionId } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401 })
    }

    const room = await resetQuestionVotes(params.pollCode, hostKey, questionId)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: 'Votes reset successfully',
      status: room.status,
    })
  } catch (err: any) {
    console.error('Error resetting votes:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
