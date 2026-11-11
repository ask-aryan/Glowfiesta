'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QrActions({
  eventId,
  hasExistingQr,
  clueMode = 'QR_CODE',
}: {
  eventId: number
  hasExistingQr: boolean
  clueMode?: string
}) {
  const router = useRouter()
  const isCode = clueMode === 'CODE'
  const [loading, setLoading] = useState(false)
  const [dummyLoading, setDummyLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleGenerate(force = false) {
    const msg = force
      ? isCode
        ? 'This will DELETE all existing clue codes and regenerate fresh 6-character codes (including festive Diwali Decoys). All old codes will stop working. Continue?'
        : 'This will DELETE all existing QR codes and regenerate fresh ones (including festive Dummy Diwali QRs). All printed QRs will stop working. Continue?'
      : isCode
      ? 'Generate 6-character clue codes for all teams, stages, and festive Dummy Diwali Decoys?'
      : 'Generate QR codes for all teams, stages, and festive Dummy Diwali QRs?'
    if (!confirm(msg)) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate codes'); return }
      setSuccess(`Generated ${data.created} ${isCode ? 'clue codes' : 'QR codes'} (including Diwali decoys)!`)
      router.refresh()
    } catch {
      setError(isCode ? 'Network error generating clue codes' : 'Network error generating QR codes')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDummyDiwali() {
    setDummyLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addDummy: true }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add decoy'); return }
      setSuccess(`Added a new Fun Dummy Diwali Decoy ${isCode ? 'Code' : 'QR'}!`)
      router.refresh()
    } catch {
      setError(isCode ? 'Network error adding decoy code' : 'Network error adding dummy QR')
    } finally {
      setDummyLoading(false)
    }
  }

  return (
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{success}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            {loading ? 'Generating…' : isCode ? 'Generate 6-Char Codes (With Decoys)' : 'Generate QR Codes (With Diwali Decoys)'}
          </button>
        ) : (
          <>
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || dummyLoading}
              style={{
                background: '#fff', color: '#b91c1c',
                border: '1px solid #fca5a5',
                borderRadius: 8, padding: '9px 14px', fontWeight: 600, fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Regenerating…' : isCode ? '↺ Regenerate All Codes' : '↺ Regenerate All QRs'}
            </button>

            <button
              onClick={handleAddDummyDiwali}
              disabled={loading || dummyLoading}
              style={{
                background: '#fef3c7', color: '#92400e',
                border: '1px solid #fcd34d',
                borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13,
                cursor: dummyLoading ? 'not-allowed' : 'pointer', opacity: dummyLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>🪔</span>
              <span>{dummyLoading ? 'Adding…' : isCode ? '+ Add Dummy Decoy Code' : '+ Add Dummy Diwali QR'}</span>
            </button>
          </>
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
            Download {isCode ? 'Codes' : 'QR'} PDF (3x3)
          </a>
        )}
      </div>
    </div>
  )
}
