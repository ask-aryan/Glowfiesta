'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QrActions({ eventId, hasExistingQr }: { eventId: number; hasExistingQr: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleGenerate(force = false) {
    const msg = force
      ? 'This will DELETE all existing QR codes and regenerate fresh ones. All printed QRs will stop working. Continue?'
      : 'Generate QR codes for all teams and stages?'
    if (!confirm(msg)) return
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch(`/api/organizer/events/${eventId}/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to generate QR codes'); return }
    setSuccess(`Generated ${data.created} QR codes!`)
    router.refresh()
  }

  return (
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{success}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {!hasExistingQr ? (
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            style={{
              background: '#FF6B35', color: '#fff',
              border: '1px solid #FF6B35',
              borderRadius: 8, padding: '9px 14px', fontWeight: 600, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Generating…' : 'Generate QR Codes'}
          </button>
        ) : (
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading}
            style={{
              background: '#fff', color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: 8, padding: '9px 14px', fontWeight: 600, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Regenerating…' : '↺ Regenerate QR Codes'}
          </button>
        )}
        {hasExistingQr && (
          <a
            href={`/api/organizer/events/${eventId}/qr-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#FF6B35', color: '#fff', border: 0,
              borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'none',
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download all as PDF
          </a>
        )}
      </div>
    </div>
  )
}
