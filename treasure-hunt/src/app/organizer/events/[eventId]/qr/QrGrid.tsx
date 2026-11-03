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
  const [appUrl, setAppUrl] = useState('')

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://glowfiesta2026.e-connectsolutions.com')
    setAppUrl(origin.replace(/\/+$/, ''))
  }, [])

  useEffect(() => {
    if (!appUrl) return
    import('qrcode').then(QRCode => {
      qrCodes.forEach(qr => {
        const url = `${appUrl}/scan/${qr.tokenHash}`
        QRCode.toDataURL(url, { width: 200, margin: 2 }).then(dataUrl => {
          setImages(prev => ({ ...prev, [qr.id]: dataUrl }))
        })
      })
    })
  }, [qrCodes, appUrl])

  const isFunDiwali = (q: QrItem) => q.tokenHash.startsWith('fun_diwali_') || (q.stageNumber === null && q.qrType === 'TEAM_STAGE')
  const funDiwalis = qrCodes.filter(isFunDiwali)
  const commonFinals = qrCodes.filter(q => q.qrType === 'COMMON_FINAL')
  const stageQrs = qrCodes.filter(q => q.qrType === 'TEAM_STAGE' && !isFunDiwali(q))

  const teams = ['ALL', ...Array.from(new Set(stageQrs.map(q => q.teamName ?? '').filter(Boolean)))]

  const filtered = activeTeam === 'ALL'
    ? stageQrs
    : stageQrs.filter(q => q.teamName === activeTeam)

  return (
    <div>
      {/* Team filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {teams.map(t => (
          <button
            key={t}
            onClick={() => setActiveTeam(t)}
            style={{
              borderRadius: 999,
              padding: '5px 13px',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              background: activeTeam === t ? '#0f172a' : '#fff',
              color: activeTeam === t ? '#fff' : '#334155',
              border: `1px solid ${activeTeam === t ? '#0f172a' : '#cbd5e1'}`,
            }}
          >
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
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#64748b', marginBottom: 12 }}>
            COMMON FINAL QR
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {commonFinals.map(qr => (
              <QrCard key={qr.id} qr={qr} imgSrc={images[qr.id]} isFinal />
            ))}
          </div>
        </div>
      )}

      {/* Fun Dummy Diwali Decoy QRs */}
      {funDiwalis.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🪔</span>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: '#b45309' }}>
              FUN DUMMY DIWALI QRs (DECOYS)
            </div>
            <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
              {funDiwalis.length} Decoys
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {funDiwalis.map(qr => (
              <QrCard key={qr.id} qr={qr} imgSrc={images[qr.id]} isDummy />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QrCard({ qr, imgSrc, isFinal, isDummy }: { qr: QrItem; imgSrc?: string; isFinal?: boolean; isDummy?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${isDummy ? '#f59e0b' : isFinal ? '#FFC857' : '#e5e7eb'}`,
      borderRadius: 12,
      padding: 12,
      background: isDummy ? '#fffbeb' : isFinal ? '#fffbeb' : '#fff',
      boxShadow: isDummy ? '0 0 0 2px rgba(245,158,11,0.2)' : isFinal ? '0 0 0 2px #FFC85733' : 'none',
    }}>
      <div style={{ aspectRatio: '1', borderRadius: 8, background: '#f8fafc', border: '1px solid #eef0f3', overflow: 'hidden', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
        {imgSrc
          ? <img src={imgSrc} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#FF6B35', animation: 'spin 1s linear infinite' }} />
        }
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isDummy ? '#92400e' : '#0f172a' }}>
        {isDummy ? '🪔 Fun Dummy QR' : isFinal ? '🏆 Final QR' : qr.teamName}
      </div>
      <div style={{ color: isDummy ? '#b45309' : '#64748b', fontSize: 11, marginTop: 2 }}>
        {isDummy ? `Happy Diwali Surprise · #${qr.displayNumber}` : isFinal ? 'Shared for all teams' : `Stage ${qr.stageNumber} · #${qr.displayNumber}`}
      </div>
      <a
        href={imgSrc ?? '#'}
        download={isDummy ? `qr-dummy-diwali-${qr.displayNumber}.png` : `qr-${qr.teamName ?? 'final'}-stage${qr.stageNumber ?? 'final'}.png`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, fontSize: 11, color: isDummy ? '#b45309' : '#64748b', textDecoration: 'none', opacity: imgSrc ? 1 : 0.3 }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download
      </a>
    </div>
  )
}
