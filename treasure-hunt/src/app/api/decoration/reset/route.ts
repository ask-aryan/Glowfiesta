import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { resetDecorationVotes } from '@/lib/decoration'

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
    const updated = await resetDecorationVotes()
    return NextResponse.json({ success: true, data: updated }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error resetting decoration votes:', err)
    return NextResponse.json({ success: false, message: 'Failed to reset votes' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
