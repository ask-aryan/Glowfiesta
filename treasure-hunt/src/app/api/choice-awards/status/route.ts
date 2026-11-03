import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { setChoiceAwardsStatus, ChoiceAwardsStatus } from '@/lib/choiceAwards'

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
    const body = await req.json().catch(() => ({}))
    const status: ChoiceAwardsStatus = body.status === 'CLOSED' ? 'CLOSED' : 'LIVE'

    const updated = await setChoiceAwardsStatus(status)
    return NextResponse.json({
      success: true,
      data: updated,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error changing Choice Awards status:', err)
    return NextResponse.json({
      success: false,
      message: 'Failed to update status',
    }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
