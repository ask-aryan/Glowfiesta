'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateEventPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [gameType, setGameType] = useState<'TREASURE_HUNT' | 'QUIZ' | 'FUNTAKSHARI'>('TREASURE_HUNT')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamCount, setTeamCount] = useState(4)
  const [membersPerTeam, setMembersPerTeam] = useState(4)
  const [stagesPerTeam, setStagesPerTeam] = useState(5)
  const [hasCommonFinalQr, setHasCommonFinalQr] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name,
      description,
      gameType,
      teamCount,
      membersPerTeam,
      stagesPerTeam: gameType === 'TREASURE_HUNT' ? stagesPerTeam : 0,
      hasCommonFinalQr: gameType === 'TREASURE_HUNT' ? hasCommonFinalQr : false,
    }

    try {
      const res = await fetch('/api/organizer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) {
        setError(data.error ?? 'Failed to create event')
        return
      }
      setOpen(false)
      router.push(`/organizer/events/${data.event.id}`)
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
    transition: 'border-color .15s',
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
          padding: '9px 14px',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
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
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,.5)', zIndex: 20 }} />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 440,
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
                <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>Create New Event</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Choose game type and setup teams</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ border: 0, background: 'none', fontSize: 24, lineHeight: 1, color: '#64748b', cursor: 'pointer', borderRadius: 6, padding: '2px 8px' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, border: '1px solid #fca5a5' }}>
                  {error}
                </div>
              )}

              {/* Game Type Dropdown */}
              <div>
                <label style={labelStyle}>
                  Select Game Type <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <select
                  value={gameType}
                  onChange={e => {
                    const selected = e.target.value as 'TREASURE_HUNT' | 'QUIZ' | 'FUNTAKSHARI'
                    setGameType(selected)
                    if (selected === 'QUIZ' && !name) setName('Diwali Quiz 2026')
                    else if (selected === 'FUNTAKSHARI' && !name) setName('Diwali Funtakshari 2026')
                  }}
                  style={{
                    ...inputStyle,
                    fontWeight: 600,
                    background: '#f8fafc',
                    borderColor: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <option value="TREASURE_HUNT">🏆 Treasure Hunt (Clues & QR Scanner)</option>
                  <option value="QUIZ">🧠 Quiz (Live Scoreboard)</option>
                  <option value="FUNTAKSHARI">🎵 Funtakshari (Musical Scoreboard)</option>
                </select>
              </div>

              {/* Offline Event notice for Quiz / Funtakshari */}
              {gameType !== 'TREASURE_HUNT' && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fcd34d',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#92400e',
                    lineHeight: 1.45,
                  }}
                >
                  <strong>✨ Offline Scoreboard Event:</strong> No player login credentials needed. You can easily add team names, team leaders, and members, then record live scores with <strong>+10, +5, -5, -10</strong> buttons and project a live animated scoreboard!
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  Event Name <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder={gameType === 'QUIZ' ? 'e.g. Diwali Quiz Contest' : gameType === 'FUNTAKSHARI' ? 'e.g. GlowFiesta Funtakshari Night' : 'e.g. GlowFiesta Treasure Hunt'}
                />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional details, rules, or timing info"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Number of Teams <span style={{ color: '#FF6B35' }}>*</span></label>
                  <input
                    type="number"
                    style={inputStyle}
                    min={1}
                    max={50}
                    value={teamCount}
                    onChange={e => setTeamCount(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Members per Team</label>
                  <input
                    type="number"
                    style={inputStyle}
                    min={1}
                    max={50}
                    value={membersPerTeam}
                    onChange={e => setMembersPerTeam(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              {/* Treasure Hunt specific options */}
              {gameType === 'TREASURE_HUNT' && (
                <>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <label style={labelStyle}>Stages per Team <span style={{ color: '#FF6B35' }}>*</span></label>
                    <input
                      type="number"
                      style={inputStyle}
                      min={1}
                      max={20}
                      value={stagesPerTeam}
                      onChange={e => setStagesPerTeam(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasCommonFinalQr}
                      onChange={e => setHasCommonFinalQr(e.target.checked)}
                      style={{ accentColor: '#FF6B35', width: 16, height: 16, margin: 0 }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>Has common final QR code</span>
                  </label>
                </>
              )}
            </form>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', color: '#334155', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={e => {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }}
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
                {loading ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
