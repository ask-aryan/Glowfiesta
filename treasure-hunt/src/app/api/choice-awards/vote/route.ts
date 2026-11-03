import { NextRequest, NextResponse } from 'next/server'
import { submitChoiceAwardsVote, submitChoiceAwardsBallot } from '@/lib/choiceAwards'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const voterHash =
      body.voterHash ||
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      `anon_${Date.now()}`

    // Single Question Voting
    if (body.categoryId && body.nomineeId) {
      const result = await submitChoiceAwardsVote({
        categoryId: body.categoryId,
        nomineeId: body.nomineeId,
        voterHash,
      })
      if (!result.success) {
        return NextResponse.json(result, { status: 400, headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
    }

    // Multi-category Ballot (fallback)
    const votes: Record<string, string> = body.votes || {}
    if (!votes || typeof votes !== 'object' || Object.keys(votes).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No nominee selected. Please select an option to vote.',
      }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const result = await submitChoiceAwardsBallot(votes, voterHash)
    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error handling Choice Awards vote:', err)
    return NextResponse.json({
      success: false,
      message: 'Failed to submit vote',
    }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
