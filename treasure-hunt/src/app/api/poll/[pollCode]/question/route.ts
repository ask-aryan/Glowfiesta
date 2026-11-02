import { NextRequest, NextResponse } from 'next/server'
import { setActiveQuestion, updateQuestion, getPollRoom } from '@/lib/poll'

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
    const { hostKey, action, index, questionData } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    if (action === 'switch') {
      const room = await setActiveQuestion(params.pollCode, hostKey, Number(index))
      if (!room) {
        return NextResponse.json({ success: false, message: 'Failed to switch question' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json({
        success: true,
        activeQuestionIndex: room.activeQuestionIndex,
        activeQuestion: room.questions[room.activeQuestionIndex],
      }, { headers: NO_CACHE_HEADERS })
    }

    if (action === 'save') {
      const room = await updateQuestion(params.pollCode, hostKey, questionData.id, {
        title: questionData.title,
        subtitle: questionData.subtitle,
        options: questionData.options || [],
      })
      if (!room) {
        return NextResponse.json({ success: false, message: 'Failed to update question' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json({
        success: true,
        questions: room.questions,
      }, { headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400, headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error updating question:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
