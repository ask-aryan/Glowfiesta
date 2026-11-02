import { NextRequest, NextResponse } from 'next/server'
import { setActiveQuestion, updateQuestion, getPollRoom } from '@/lib/poll'

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, action, index, questionData } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401 })
    }

    if (action === 'switch') {
      const room = await setActiveQuestion(params.pollCode, hostKey, Number(index))
      if (!room) {
        return NextResponse.json({ success: false, message: 'Failed to switch question' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        activeQuestionIndex: room.activeQuestionIndex,
        activeQuestion: room.questions[room.activeQuestionIndex],
      })
    }

    if (action === 'save') {
      const room = await updateQuestion(params.pollCode, hostKey, questionData.id, {
        title: questionData.title,
        subtitle: questionData.subtitle,
        options: questionData.options || [],
      })
      if (!room) {
        return NextResponse.json({ success: false, message: 'Failed to update question' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        questions: room.questions,
      })
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('Error updating question:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
