import { NextRequest, NextResponse } from 'next/server'
import { getPollRoom } from '@/lib/poll'

export async function GET(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const room = await getPollRoom(params.pollCode)
    if (!room) {
      return NextResponse.json({ success: false, message: 'Poll room not found' }, { status: 404 })
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

    // Format options with percentages
    const optionsWithPercent = (activeQuestion?.options || []).map(opt => {
      const total = activeQuestion?.totalVotes || 0
      const percent = total > 0 ? Math.round((opt.votesCount / total) * 100) : 0
      return {
        ...opt,
        percentage: percent,
      }
    })

    return NextResponse.json({
      success: true,
      roomCode: room.id,
      title: room.title,
      status: room.status,
      activeQuestionIndex: room.activeQuestionIndex,
      totalQuestions: room.questions.length,
      isHost,
      activeQuestion: activeQuestion ? {
        id: activeQuestion.id,
        title: activeQuestion.title,
        subtitle: activeQuestion.subtitle,
        options: optionsWithPercent,
        totalVotes: activeQuestion.totalVotes,
        winnerOptionId: activeQuestion.winnerOptionId,
      } : null,
      myVote,
      questionsList: isHost ? room.questions.map((q, idx) => ({
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        optionsCount: q.options.length,
        totalVotes: q.totalVotes,
        isActive: idx === room.activeQuestionIndex,
      })) : undefined,
      serverTime: Date.now(),
    })
  } catch (err: any) {
    console.error('Error fetching poll room:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
