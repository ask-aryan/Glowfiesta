import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { saveDecorationSetup } from '@/lib/decoration'

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
    const teams = Array.isArray(body.teams) ? body.teams : []
    const criteria = Array.isArray(body.criteria) ? body.criteria : []

    if (teams.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one team counter is required' }, { status: 400, headers: NO_CACHE_HEADERS })
    }
    if (criteria.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one scoring factor is required' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const updated = await saveDecorationSetup({
      title: body.title,
      teams,
      criteria,
    })

    return NextResponse.json({ success: true, data: updated }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Error saving decoration setup:', err)
    return NextResponse.json({ success: false, message: 'Failed to save setup' }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
