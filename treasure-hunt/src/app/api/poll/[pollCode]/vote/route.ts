import { NextRequest, NextResponse } from 'next/server'
import { castVote } from '@/lib/poll'

export async function POST(
  req: NextRequest,
  { params }: { params: { pollCode: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const { questionId, optionId, voterId, voterName, isAnonymous } = body

    if (!questionId || !optionId || !voterId) {
      return NextResponse.json({ success: false, message: 'Missing voting parameters' }, { status: 400 })
    }

    const result = await castVote(
      params.pollCode,
      questionId,
      optionId,
      voterId,
      voterName,
      Boolean(isAnonymous)
    )

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || 'Vote failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      alreadyVoted: Boolean(result.alreadyVoted),
      totalVotes: result.totalVotes,
      message: result.message || 'Vote successfully cast!',
    })
  } catch (err: any) {
    console.error('Error casting vote:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
