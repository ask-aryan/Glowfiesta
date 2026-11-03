import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { resetChoiceAwardsBallots } from '@/lib/choiceAwards'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(req: NextRequest) {
  const { error } = await requireOrganizer()
  if (error) return error

  try {
    const updated = await resetChoiceAwardsBallots()
    return NextResponse.json({
      success: true,
      message: 'All ballots have been cleared',
      data: updated,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error resetting Choice Awards ballots:', err)
    return NextResponse.json({
      success: false,
      message: 'Failed to reset ballots',
    }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
