import { NextRequest, NextResponse } from 'next/server'
import { setActiveQuestion, advanceToNextCategory, updateQuestion, deleteQuestion, getPollRoom } from '@/lib/poll'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

function formatRoomQuestions(room: any) {
  const allQuestionsWithPercent = (room.questions || []).map((q: any, idx: number) => {
    const total = q.totalVotes || 0
    return {
      id: q.id,
      title: q.title,
      subtitle: q.subtitle,
      totalVotes: total,
      winnerOptionId: q.winnerOptionId,
      isActive: idx === room.activeQuestionIndex,
      options: (q.options || []).map((opt: any) => ({
        ...opt,
        percentage: total > 0 ? Math.round((opt.votesCount / total) * 100) : 0,
      })),
    }
  })

  return {
    status: room.status,
    questions: allQuestionsWithPercent,
    activeQuestion: allQuestionsWithPercent[room.activeQuestionIndex] || allQuestionsWithPercent[0] || null,
    activeQuestionIndex: room.activeQuestionIndex,
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { hostKey, action, index, questionData, questionId } = body

    if (!hostKey) {
      return NextResponse.json({ success: false, message: 'Admin key required' }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    if (action === 'switch') {
      const room = await setActiveQuestion(params.pollCode, hostKey, Number(index))
      if (!room) {
        return NextResponse.json({ success: false, message: 'Failed to switch question' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const formatted = formatRoomQuestions(room)
      return NextResponse.json({
        success: true,
        ...formatted,
      }, { headers: NO_CACHE_HEADERS })
    }

    if (action === 'next') {
      const room = await advanceToNextCategory(params.pollCode, hostKey)
      if (!room) {
        return NextResponse.json({ success: false, message: 'No more categories' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const formatted = formatRoomQuestions(room)
      return NextResponse.json({
        success: true,
        ...formatted,
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

      // If switchAfterSave is requested, set active index to this question
      let targetIndex = room.questions.findIndex(q => q.id === questionData.id)
      if (body.switchAfterSave && targetIndex !== -1) {
        await setActiveQuestion(params.pollCode, hostKey, targetIndex)
      }

      const formatted = formatRoomQuestions(room)
      return NextResponse.json({
        success: true,
        ...formatted,
      }, { headers: NO_CACHE_HEADERS })
    }

    if (action === 'delete') {
      const targetId = questionId || (questionData && questionData.id)
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'questionId required' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const room = await deleteQuestion(params.pollCode, hostKey, targetId)
      if (!room) {
        return NextResponse.json({ success: false, message: 'Cannot delete category (minimum 1 required)' }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const formatted = formatRoomQuestions(room)
      return NextResponse.json({
        success: true,
        ...formatted,
      }, { headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400, headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error updating question:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
