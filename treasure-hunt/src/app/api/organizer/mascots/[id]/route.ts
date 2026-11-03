import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/auth'
import { getMascotById, deleteMascotSubmission } from '@/lib/mascot'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  try {
    const mascot = await getMascotById(params.id)
    if (!mascot) {
      return NextResponse.json({ error: 'Mascot not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, mascot })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireOrganizer()
  if (error) return error

  try {
    await deleteMascotSubmission(params.id)
    return NextResponse.json({ success: true, message: 'Mascot submission deleted' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
