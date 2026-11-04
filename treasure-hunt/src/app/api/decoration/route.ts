import { NextRequest, NextResponse } from 'next/server'
import { getDecorationEvent } from '@/lib/decoration'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(req: NextRequest) {
  try {
    const data = await getDecorationEvent()
    return NextResponse.json({ success: true, data }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error fetching decoration event:', err)
    return NextResponse.json({ success: false, message: 'Failed to fetch decoration data' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
