import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { updateChoiceAwardsLiveControl } from '@/lib/choiceAwards'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireOrganizer()
    if (error) return error

    const body = await req.json().catch(() => ({}))
    const { action, categoryId, mode } = body

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const updated = await updateChoiceAwardsLiveControl({ action, categoryId, mode })
    return NextResponse.json({ success: true, data: updated }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error in live-control route:', err)
    return NextResponse.json(
      { success: false, message: 'Failed to update live control' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
