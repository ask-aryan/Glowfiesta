import { NextRequest, NextResponse } from 'next/server'
import { updatePollStatus, setShowResultsLive, PollStatus } from '@/lib/poll'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, status, winnerOptionId, showResultsLive } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    // Toggle live results vs suspense mode
    if (typeof showResultsLive === 'boolean') {
      const room = await setShowResultsLive(params.pollCode, hostKey, showResultsLive)
      if (!room) {
        return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json({
        success: true,
        showResultsLive: room.showResultsLive,
        status: room.status,
        activeQuestionIndex: room.activeQuestionIndex,
      }, { headers: NO_CACHE_HEADERS })
    }

    if (!status || !['DRAFT', 'READY', 'LIVE', 'STOPPED', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const room = await updatePollStatus(params.pollCode, hostKey, status as PollStatus, winnerOptionId)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Room not found or unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json({
      success: true,
      status: room.status,
      activeQuestionIndex: room.activeQuestionIndex,
      showResultsLive: room.showResultsLive,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error updating poll status:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
