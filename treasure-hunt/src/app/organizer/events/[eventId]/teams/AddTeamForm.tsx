'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddTeamPanel({ eventId }: { eventId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!teamName.trim() || !username.trim() || !password) { setError('All fields are required'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/organizer/events/${eventId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, username, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add team'); return }
    setOpen(false)
    setTeamName(''); setUsername(''); setPassword('')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #cbd5e1', borderRadius: 8,
    padding: '9px 11px', fontSize: 13, outline: 'none', background: '#fff',
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: '#FF6B35', color: '#fff', border: 0, borderRadius: 8, padding: '9px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
      >
        + Add Team
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.45)', zIndex: 20 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw', background: '#fff', zIndex: 21, boxShadow: '-12px 0 40px rgba(11,18,32,.18)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Add Team</div>
              <button onClick={() => setOpen(false)} style={{ border: 0, background: 'none', fontSize: 22, lineHeight: 1, color: '#64748b', cursor: 'pointer', borderRadius: 6, padding: '2px 8px' }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
              <div>
                <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Team Name <span style={{ color: '#FF6B35' }}>*</span></label>
                <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Alpha" />
              </div>
              <div>
                <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Login Username <span style={{ color: '#FF6B35' }}>*</span></label>
                <input style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} value={username} onChange={e => setUsername(e.target.value)} placeholder="team_alpha" />
              </div>
              <div>
                <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Password <span style={{ color: '#FF6B35' }}>*</span></label>
                <input style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} value={password} onChange={e => setPassword(e.target.value)} placeholder="hunter2026" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setOpen(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 14px', fontWeight: 600, cursor: 'pointer', color: '#334155' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading} style={{ background: '#FF6B35', color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Adding…' : 'Add Team'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
