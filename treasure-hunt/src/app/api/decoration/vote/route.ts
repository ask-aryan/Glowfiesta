import { NextRequest, NextResponse } from 'next/server'
import { submitDecorationBallot } from '@/lib/decoration'

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

    const scores = body.scores
    if (!scores || typeof scores !== 'object') {
      return NextResponse.json({ success: false, message: 'Scores payload missing' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const result = await submitDecorationBallot({
      voterHash,
      scores,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error submitting decoration scores:', err)
    return NextResponse.json({ success: false, message: 'Failed to record scores' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
