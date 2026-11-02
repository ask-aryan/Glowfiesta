import { NextRequest, NextResponse } from 'next/server'
import { castVote } from '@/lib/poll'

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
    const { questionId, optionId, voterId, voterName, isAnonymous } = body

    if (!questionId || !optionId || !voterId) {
      return NextResponse.json({ success: false, message: 'Missing required voting parameters' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const result = await castVote(
      params.pollCode,
      questionId,
      optionId,
      voterId,
      voterName,
      Boolean(isAnonymous)
    )

    if (!result.success && !result.alreadyVoted) {
      return NextResponse.json(result, { status: 400, headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error submitting vote:', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
