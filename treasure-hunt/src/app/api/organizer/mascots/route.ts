import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { getMascotSubmissions } from '@/lib/mascot'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { error } = await requireOrganizer()
  if (error) return error

  try {
    const list = await getMascotSubmissions()
    return NextResponse.json({ success: true, mascots: list })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
