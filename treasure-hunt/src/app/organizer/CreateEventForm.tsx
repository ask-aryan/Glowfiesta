'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateEventPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamCount, setTeamCount] = useState(4)
  const [stagesPerTeam, setStagesPerTeam] = useState(5)
  const [hasCommonFinalQr, setHasCommonFinalQr] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/organizer/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, teamCount, stagesPerTeam, hasCommonFinalQr }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to create event'); return }
    setOpen(false)
    router.push(`/organizer/events/${data.event.id}`)
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #cbd5e1', borderRadius: 8,
    padding: '9px 11px', fontSize: 13, outline: 'none', background: '#fff',
  }
  const labelStyle: React.CSSProperties = { fontWeight: 600, marginBottom: 6, display: 'block' }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: '#FF6B35', color: '#fff', border: 0, borderRadius: 8,
          padding: '9px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          display: 'flex', gap: 6, alignItems: 'center',
          boxShadow: '0 1px 2px rgba(255,107,53,.4)',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Create Event
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.45)', zIndex: 20 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            maxWidth: '100vw', background: '#fff', zIndex: 21,
            boxShadow: '-12px 0 40px rgba(11,18,32,.18)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Create New Event</div>
              <button onClick={() => setOpen(false)} style={{ border: 0, background: 'none', fontSize: 22, lineHeight: 1, color: '#64748b', cursor: 'pointer', borderRadius: 6, padding: '2px 8px' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
              <div>
                <label style={labelStyle}>Event Name <span style={{ color: '#FF6B35' }}>*</span></label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required placeholder="GlowFiesta Treasure Hunt" />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional event description" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Teams</label>
                  <input type="number" style={inputStyle} min={1} max={20} value={teamCount} onChange={e => setTeamCount(parseInt(e.target.value))} required />
                </div>
                <div>
                  <label style={labelStyle}>Stages / Team</label>
                  <input type="number" style={inputStyle} min={1} max={20} value={stagesPerTeam} onChange={e => setStagesPerTeam(parseInt(e.target.value))} required />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={hasCommonFinalQr} onChange={e => setHasCommonFinalQr(e.target.checked)} style={{ accentColor: '#FF6B35', width: 16, height: 16, margin: 0 }} />
                <span style={{ fontWeight: 500 }}>Has common final QR</span>
              </label>
            </form>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setOpen(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 14px', fontWeight: 600, cursor: 'pointer', color: '#334155' }}>Cancel</button>
              <button onClick={e => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }} disabled={loading} style={{ background: '#FF6B35', color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
