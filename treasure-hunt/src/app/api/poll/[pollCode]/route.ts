import { NextRequest, NextResponse } from 'next/server'
import { getPollRoom } from '@/lib/poll'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const room = await getPollRoom(params.pollCode)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Poll room not found' }, { status: 404, headers: NO_CACHE_HEADERS })
    }

    const { searchParams } = new URL(req.url)
    const hostKey = searchParams.get('hostKey')
    const voterId = searchParams.get('voterId')

    const isHost = Boolean(hostKey && hostKey === room.hostKey)
    const activeQuestion = room.questions[room.activeQuestionIndex] || room.questions[0] || null

    let myVote = null
    if (voterId && activeQuestion) {
      const v = room.votes.find(item => item.questionId === activeQuestion.id && item.voterId === voterId)
      if (v) {
        myVote = {
          optionId: v.optionId,
          voterName: v.voterName,
          isAnonymous: v.isAnonymous,
          votedAt: v.votedAt,
        }
      }
    }

    // Format all questions with options and percentages for instant client navigation
    const allQuestionsWithPercent = (room.questions || []).map((q, idx) => {
      const total = q.totalVotes || 0
      return {
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        totalVotes: total,
        winnerOptionId: q.winnerOptionId,
        isActive: idx === room.activeQuestionIndex,
        options: (q.options || []).map(opt => ({
          ...opt,
          percentage: total > 0 ? Math.round((opt.votesCount / total) * 100) : 0,
        })),
      }
    })

    const activeQuestionWithPercent = allQuestionsWithPercent[room.activeQuestionIndex] || allQuestionsWithPercent[0] || null

    return NextResponse.json({
      success: true,
      roomCode: room.id,
      title: room.title,
      status: room.status,
      activeQuestionIndex: room.activeQuestionIndex,
      totalQuestions: room.questions.length,
      isHost,
      activeQuestion: activeQuestionWithPercent,
      questions: allQuestionsWithPercent,
      questionsList: allQuestionsWithPercent.map((q, idx) => ({
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        optionsCount: q.options.length,
        totalVotes: q.totalVotes,
        isActive: idx === room.activeQuestionIndex,
      })),
      myVote,
      serverTime: Date.now(),
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error fetching poll room:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
