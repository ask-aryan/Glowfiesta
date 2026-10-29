import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import QrActions from './QrActions'
import QrGrid from './QrGrid'

async function getQrInfo(eventId: number) {
  const { prisma } = await import('@/lib/db')
  const [event, qrCodes] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true, id: true, hasCommonFinalQr: true } }),
    prisma.qrCode.findMany({
      where: { eventId },
      include: { assignedTeam: { select: { teamName: true } } },
      orderBy: [{ qrType: 'asc' }, { assignedTeamId: 'asc' }, { stageNumber: 'asc' }],
    }),
  ])
  return { event, qrCodes }
}

export default async function QrPage({ params }: { params: { eventId: string } }) {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') redirect('/login')

  const eventId = parseInt(params.eventId)
  const { event, qrCodes } = await getQrInfo(eventId)

  if (!event) return <div style={{ padding: 32, color: '#b91c1c' }}>Event not found.</div>

  const qrCount = qrCodes.length
  const gridItems = qrCodes.map((q, i) => ({
    id: q.id,
    tokenHash: q.tokenHash,
    qrType: q.qrType,
    stageNumber: q.stageNumber,
    displayNumber: i + 1,
    teamName: q.assignedTeam?.teamName ?? null,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ color: '#64748b', marginBottom: 6 }}>{event.name}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>
            QR Codes <span style={{ color: '#94a3b8', fontWeight: 500 }}>{qrCount}</span>
          </div>
        </div>
        <QrActions eventId={eventId} hasExistingQr={qrCount > 0} />
      </div>

      {event.hasCommonFinalQr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff7f2', border: '1px solid #fed7c3', color: '#9a3412', borderRadius: 8, padding: '9px 12px', marginBottom: 20, fontSize: 13 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          Common final QR is enabled for this event. QR codes are generated — download the PDF to print them.
        </div>
      )}

      {qrCount === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No QR codes yet</div>
          <div>Generate QR codes after adding all teams and clues</div>
        </div>
      ) : (
        <QrGrid qrCodes={gridItems} eventId={eventId} />
      )}
    </div>
  )
}
