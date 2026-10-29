'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddTeamPanel({
  eventId,
  gameType = 'TREASURE_HUNT',
}: {
  eventId: number
  gameType?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [members, setMembers] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isScoreGame = gameType === 'QUIZ' || gameType === 'FUNTAKSHARI'

  async function handleSubmit() {
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    if (!isScoreGame && (!username.trim() || !password)) {
      setError('Username and password are required for Treasure Hunt')
      return
    }

    setLoading(true)
    setError('')

    const payload = isScoreGame
      ? { teamName, leaderName, members }
      : { teamName, username, password, leaderName, members }

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) {
        setError(data.error ?? 'Failed to add team')
        return
      }
      setOpen(false)
      setTeamName('')
      setLeaderName('')
      setMembers('')
      setUsername('')
      setPassword('')
      router.refresh()
    } catch {
      setLoading(false)
      setError('Network error. Please try again.')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #cbd5e1',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    outline: 'none',
    background: '#fff',
  }
  const labelStyle: React.CSSProperties = { fontWeight: 600, marginBottom: 6, display: 'block', fontSize: 13 }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          setError('')
        }}
        style={{
          background: '#FF6B35',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          padding: '9px 16px',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 1px 2px rgba(255,107,53,.4)',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Team
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.45)', zIndex: 20 }} />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              maxWidth: '100vw',
              background: '#fff',
              zIndex: 21,
              boxShadow: '-12px 0 40px rgba(11,18,32,.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {isScoreGame ? 'Register Team' : 'Add Team (Player Login)'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {isScoreGame ? 'No credentials needed for offline score tracking' : 'Creates team credentials for player portal'}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ border: 0, background: 'none', fontSize: 22, lineHeight: 1, color: '#64748b', cursor: 'pointer', borderRadius: 6, padding: '2px 8px' }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, border: '1px solid #fca5a5' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  Team Name <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <input
                  style={inputStyle}
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Golden Sparks, Rockstars"
                  autoFocus
                />
              </div>

              {/* Offline score game fields: Team Leader & Members */}
              <div>
                <label style={labelStyle}>Team Leader</label>
                <input
                  style={inputStyle}
                  value={leaderName}
                  onChange={e => setLeaderName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                />
              </div>

              <div>
                <label style={labelStyle}>Team Members</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  value={members}
                  onChange={e => setMembers(e.target.value)}
                  placeholder="e.g. Priya, Rohit, Neha, Sahil (comma or newline separated)"
                />
              </div>

              {/* Only for Treasure Hunt: Username and Password */}
              {!isScoreGame && (
                <>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <label style={labelStyle}>
                      Login Username <span style={{ color: '#FF6B35' }}>*</span>
                    </label>
                    <input
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="team_alpha"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Password <span style={{ color: '#FF6B35' }}>*</span>
                    </label>
                    <input
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="hunter2026"
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', color: '#334155', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                  boxShadow: '0 2px 8px rgba(255,107,53,.35)',
                  fontSize: 13,
                }}
              >
                {loading ? 'Adding…' : 'Add Team'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
