'use client'
import { useEffect, useState } from 'react'

interface QrItem {
  id: number
  tokenHash: string
  qrType: string
  stageNumber: number | null
  displayNumber: number
  teamName: string | null
}

export default function QrGrid({ qrCodes, eventId }: { qrCodes: QrItem[]; eventId: number }) {
  const [images, setImages] = useState<Record<number, string>>({})
  const [activeTeam, setActiveTeam] = useState<string>('ALL')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  useEffect(() => {
    import('qrcode').then(QRCode => {
      qrCodes.forEach(qr => {
        const url = `${appUrl}/scan/${qr.tokenHash}`
        QRCode.toDataURL(url, { width: 200, margin: 2 }).then(dataUrl => {
          setImages(prev => ({ ...prev, [qr.id]: dataUrl }))
        })
      })
    })
  }, [qrCodes, appUrl])

  const teams = ['ALL', ...Array.from(new Set(qrCodes.filter(q => q.qrType === 'TEAM_STAGE').map(q => q.teamName ?? '')))]
  const commonFinals = qrCodes.filter(q => q.qrType === 'COMMON_FINAL')
  const filtered = activeTeam === 'ALL'
    ? qrCodes.filter(q => q.qrType === 'TEAM_STAGE')
    : qrCodes.filter(q => q.qrType === 'TEAM_STAGE' && q.teamName === activeTeam)

  return (
    <div>
      {/* Team filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {teams.map(t => (
          <button key={t} onClick={() => setActiveTeam(t)} style={{
            borderRadius: 999, padding: '5px 13px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            background: activeTeam === t ? '#0f172a' : '#fff',
            color: activeTeam === t ? '#fff' : '#334155',
            border: `1px solid ${activeTeam === t ? '#0f172a' : '#cbd5e1'}`,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Team stage QR grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {filtered.map(qr => (
          <QrCard key={qr.id} qr={qr} imgSrc={images[qr.id]} />
        ))}
      </div>

      {/* Common Final QR */}
      {commonFinals.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#64748b', marginBottom: 12 }}>COMMON FINAL QR</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {commonFinals.map(qr => (
              <QrCard key={qr.id} qr={qr} imgSrc={images[qr.id]} isFinal />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function QrCard({ qr, imgSrc, isFinal }: { qr: QrItem; imgSrc?: string; isFinal?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${isFinal ? '#FFC857' : '#e5e7eb'}`,
      borderRadius: 12, padding: 12,
      background: isFinal ? '#fffbeb' : '#fff',
      boxShadow: isFinal ? '0 0 0 2px #FFC85733' : 'none',
    }}>
      <div style={{ aspectRatio: '1', borderRadius: 8, background: '#f8fafc', border: '1px solid #eef0f3', overflow: 'hidden', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
        {imgSrc
          ? <img src={imgSrc} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#FF6B35', animation: 'spin 1s linear infinite' }} />
        }
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {isFinal ? '🏆 Final QR' : qr.teamName}
      </div>
      <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
        {isFinal ? 'Shared for all teams' : `Stage ${qr.stageNumber} · #${qr.displayNumber}`}
      </div>
      <a
        href={imgSrc ?? '#'}
        download={`qr-${qr.teamName ?? 'final'}-stage${qr.stageNumber ?? 'final'}.png`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#64748b', textDecoration: 'none', opacity: imgSrc ? 1 : 0.3 }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download
      </a>
    </div>
  )
}
