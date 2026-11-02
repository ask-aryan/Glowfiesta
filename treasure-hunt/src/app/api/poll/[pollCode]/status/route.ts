import { NextRequest, NextResponse } from 'next/server'
import { updatePollStatus, PollStatus } from '@/lib/poll'

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, status, winnerOptionId } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401 })
    }

    if (!['DRAFT', 'READY', 'LIVE', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
    }

    const room = await updatePollStatus(params.pollCode, hostKey, status as PollStatus, winnerOptionId)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      status: room.status,
      activeQuestionIndex: room.activeQuestionIndex,
    })
  } catch (err: any) {
    console.error('Error updating poll status:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
