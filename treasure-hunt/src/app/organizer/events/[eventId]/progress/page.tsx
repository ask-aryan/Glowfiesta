'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

interface TeamProgress {
  teamId: number
  teamName: string
  leaderName?: string | null
  members?: string | null
  status: string
  currentStage: number
  lastScanTime: string | null
  awaitingVerification: boolean
  pendingStages: number[]
  completedAt: string | null
}

interface EventData {
  id: number
  name: string
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'COMPLETED' | string
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

// ── 4-Block Code Verification Input Component ─────────────────────────────
function FourBlockVerify({
  teamId,
  stageNumber,
  teamName,
  eventId,
  onSuccess,
}: {
  teamId: number
  stageNumber: number
  teamName: string
  eventId: string
  onSuccess: () => void
}) {
  const [blocks, setBlocks] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleInput(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!raw) {
      const next = [...blocks]
      next[index] = ''
      setBlocks(next)
      return
    }

    // If pasted or autocompleted with multiple chars
    if (raw.length > 1) {
      const next = [...blocks]
      for (let i = 0; i < 4; i++) {
        if (raw[i]) next[i] = raw[i]
      }
      setBlocks(next)
      const targetIdx = Math.min(3, raw.length - 1)
      inputRefs[targetIdx].current?.focus()
      return
    }

    const char = raw.slice(-1)
    const next = [...blocks]
    next[index] = char
    setBlocks(next)
    if (index < 3) {
      inputRefs[index + 1].current?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!blocks[index] && index > 0) {
        const next = [...blocks]
        next[index - 1] = ''
        setBlocks(next)
        inputRefs[index - 1].current?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs[index - 1].current?.focus()
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault()
      inputRefs[index + 1].current?.focus()
    } else if (e.key === 'Enter') {
      submitVerify()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!text) return
    const next = [...blocks]
    for (let i = 0; i < 4; i++) {
      next[i] = text[i] || ''
    }
    setBlocks(next)
    const targetIdx = Math.min(3, text.length - 1)
    inputRefs[Math.max(0, targetIdx)].current?.focus()
  }

  async function submitVerify() {
    const code = blocks.join('').trim().toUpperCase()
    if (code.length !== 4) {
      setMessage({ type: 'error', text: 'Please enter all 4 letters of the verification code.' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}/verify-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedCode: code, stageNumber }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Verification failed. Please check the code.' })
        inputRefs[0].current?.focus()
      } else {
        setMessage({
          type: 'success',
          text: data.isLastStage
            ? `✓ Final stage verified! Common final clue unlocked for ${teamName}.`
            : `✓ Stage ${stageNumber} verified! Stage ${data.nextStage} clue released to ${teamName}.`,
        })
        setBlocks(['', '', '', ''])
        onSuccess()
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
        border: '2px solid #f59e0b',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 4px 16px rgba(245,158,11,0.14)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
            Reception Verification · Stage {stageNumber}
          </span>
          <span style={{ fontSize: 12, color: '#b45309', background: '#fde68a', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
            {teamName} is at the desk
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#78350f' }}>
          Ask team for their 4-letter code shown on their screen
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* 4 Block Input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {blocks.map((char, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              maxLength={1}
              value={char}
              onChange={e => handleInput(i, e)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              placeholder="·"
              style={{
                width: 54,
                height: 58,
                borderRadius: 12,
                border: char ? '2.5px solid #d97706' : '2px solid #cbd5e1',
                background: '#fff',
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'center',
                textTransform: 'uppercase',
                color: '#1e293b',
                outline: 'none',
                boxShadow: char ? '0 0 0 3px rgba(217,119,6,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border .15s ease, box-shadow .15s ease',
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={submitVerify}
          disabled={loading}
          style={{
            height: 58,
            padding: '0 26px',
            borderRadius: 12,
            border: 0,
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
            transition: 'transform .1s ease, filter .15s ease',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.75s linear infinite',
                  display: 'inline-block',
                }}
              />
              <span>Verifying…</span>
            </>
          ) : (
            <>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Verify & Release Clue</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: message.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────
export default function ProgressPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [teams, setTeams] = useState<TeamProgress[]>([])
  const [stagesPerTeam, setStagesPerTeam] = useState(5)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const [statusLoading, setStatusLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamProgress | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/progress`)
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
        if (data.event) {
          setEventData(data.event)
        }
        if (typeof data.stagesPerTeam === 'number') {
          setStagesPerTeam(data.stagesPerTeam)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchProgress()
    const dataInterval = setInterval(fetchProgress, 5000)
    const countInterval = setInterval(() => setCountdown(c => (c <= 1 ? 5 : c - 1)), 1000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(countInterval)
    }
  }, [fetchProgress])

  async function handleStatusAction(action: string) {
    if (action === 'close') {
      const ok = window.confirm('Are you sure you want to CLOSE the hunt? Teams will no longer be able to scan or submit clues.')
      if (!ok) return
    }
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to update event status')
      } else {
        await fetchProgress()
      }
    } catch {
      alert('Network error while updating event status')
    } finally {
      setStatusLoading(false)
    }
  }

  const sorted = [...teams].sort((a, b) => b.currentStage - a.currentStage)
  const leader = sorted[0]

  return (
    <div>
      {/* Top Bar: Title & Refresh counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: '#0f172a' }}>Live Progress</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Real-time team stages and reception desk verification</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#64748b', fontSize: 13 }}>
          <span>Refreshing in <strong style={{ color: '#0f172a' }}>{countdown}s</strong></span>
          <div style={{ width: 64, height: 5, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#FF6B35', width: `${(countdown / 5) * 100}%`, transition: 'width 1s linear' }} />
          </div>
        </div>
      </div>

      {/* Event Status Management Header Card */}
      {eventData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 16,
            padding: '16px 22px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Hunt Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {eventData.status === 'LIVE' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #86efac',
                      boxShadow: '0 0 12px rgba(34,197,94,0.3)',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-ring 1.6s infinite' }} />
                    LIVE
                  </span>
                ) : eventData.status === 'PAUSED' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fcd34d',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    PAUSED
                  </span>
                ) : eventData.status === 'READY' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#e0f2fe',
                      color: '#075985',
                      border: '1px solid #7dd3fc',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                    READY TO START
                  </span>
                ) : eventData.status === 'COMPLETED' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    🏁 HUNT CLOSED
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {eventData.status}
                  </span>
                )}
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{eventData.name}</span>
              </div>
            </div>
          </div>

          {/* Quick status transition action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {eventData.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusAction('start')}
                disabled={statusLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 0,
                  background: '#3b82f6',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: statusLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Mark as Ready
              </button>
            )}

            {eventData.status === 'READY' && (
              <button
                onClick={() => handleStatusAction('start')}
                disabled={statusLoading}
                style={{
                  padding: '10px 22px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: statusLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                }}
              >
                🚀 Go Live (Start Hunt)
              </button>
            )}

            {eventData.status === 'LIVE' && (
              <>
                <button
                  onClick={() => handleStatusAction('pause')}
                  disabled={statusLoading}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: '1.5px solid #f59e0b',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: statusLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⏸️</span> Pause Hunt
                </button>
                <button
                  onClick={() => handleStatusAction('close')}
                  disabled={statusLoading}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 0,
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: statusLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  🏁 Close Hunt
                </button>
              </>
            )}

            {eventData.status === 'PAUSED' && (
              <>
                <button
                  onClick={() => handleStatusAction('resume')}
                  disabled={statusLoading}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: statusLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>▶️</span> Resume Hunt
                </button>
                <button
                  onClick={() => handleStatusAction('close')}
                  disabled={statusLoading}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 0,
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: statusLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  🏁 Close Hunt
                </button>
              </>
            )}

            {eventData.status === 'COMPLETED' && (
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>All stages finalized</span>
            )}
          </div>
        </div>
      )}

      {/* Stats Counter Bar */}
      {!loading && teams.length > 0 && (
        <div style={{ display: 'flex', gap: 36, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '14px 12px', marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '.05em' }}>LEADING</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: '#e8541f' }}>{leader?.teamName ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '.05em' }}>TEAMS</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: '#0f172a' }}>{teams.length}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '.05em' }}>COMPLETED</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: '#16a34a' }}>{teams.filter(t => t.status === 'COMPLETED').length}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center', color: '#64748b', fontSize: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e' }} />Completed</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#FF6B35' }} />Current</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#e2e8f0' }} />Locked</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#f59e0b', border: '1px solid #d97706' }} />Awaiting verify</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px 0' }}>Loading progress…</div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No teams registered for this hunt yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((team, idx) => {
            const isLead = idx === 0 && team.currentStage > (sorted[1]?.currentStage ?? -1)
            const color = COLORS[idx % COLORS.length]
            const awaiting = team.awaitingVerification

            return (
              <div
                key={team.teamId}
                style={{
                  background: team.status === 'COMPLETED' ? '#f0fdf4' : awaiting ? '#fffbeb' : isLead ? '#fffdfa' : '#ffffff',
                  border: awaiting ? '2px solid #f59e0b' : team.status === 'COMPLETED' ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '16px 20px',
                  boxShadow: awaiting ? '0 4px 18px rgba(245,158,11,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all .2s ease',
                }}
              >
                {/* Main Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 220px minmax(0,1fr) 140px',
                    gap: 18,
                    alignItems: 'center',
                  }}
                >
                  {/* Column 1: Rank */}
                  <div style={{ fontWeight: 800, fontSize: 16, color: idx === 0 ? '#e8541f' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {idx + 1}
                  </div>

                  {/* Column 2: Team Name (clickable for details) */}
                  <div
                    onClick={() => setSelectedTeam(team)}
                    title="Click to view team leader and players"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#0f172a',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {team.teamName.trim().slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      textUnderlineOffset: 3,
                    }}>
                      {team.teamName}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }} title="View team members">👥</span>
                    {isLead && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', background: '#FF6B35', color: '#fff', borderRadius: 999, padding: '2px 8px' }}>LEADING</span>}
                    {team.status === 'COMPLETED' && <span style={{ fontSize: 18 }}>🏆</span>}
                  </div>

                  {/* Column 3: Visual Stage Bar */}
                  <div>
                    <StageBar team={team} stagesPerTeam={stagesPerTeam} />
                  </div>

                  {/* Column 4: Status Indicator */}
                  <div style={{ textAlign: 'right' }}>
                    {awaiting ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #f59e0b',
                        }}
                      >
                        ⏳ At Desk
                      </span>
                    ) : team.status === 'COMPLETED' ? (
                      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
                        ✓ Done {team.completedAt ? new Date(team.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                        Stage {team.currentStage} of {stagesPerTeam}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded 4-Block Verification Panel (directly under respective stage) */}
                {awaiting && (
                  <div style={{ marginTop: 8, paddingLeft: 50 }}>
                    {team.pendingStages.map(stageNumber => (
                      <FourBlockVerify
                        key={stageNumber}
                        teamId={team.teamId}
                        stageNumber={stageNumber}
                        teamName={team.teamName}
                        eventId={eventId}
                        onSuccess={fetchProgress}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <div
          onClick={() => setSelectedTeam(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              padding: '24px 26px',
              width: '100%',
              maxWidth: 420,
              boxSizing: 'border-box',
              animation: 'pop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                  color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14
                }}>
                  {selectedTeam.teamName.trim().slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selectedTeam.teamName}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Team Details &amp; Players</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  👑 Team Leader
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: selectedTeam.leaderName ? '#0f172a' : '#94a3b8' }}>
                  {selectedTeam.leaderName || 'No leader specified'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  👥 Players / Members
                </div>
                {selectedTeam.members ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {selectedTeam.members.split(',').map((p, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {p.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                    No player names added yet
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: selectedTeam.status === 'COMPLETED' ? '#f0fdf4' : '#fffbeb', border: selectedTeam.status === 'COMPLETED' ? '1px solid #bbf7d0' : '1px solid #fef08a' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Current Status:</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: selectedTeam.status === 'COMPLETED' ? '#16a34a' : '#b45309' }}>
                  {selectedTeam.status === 'COMPLETED' ? '🏆 Completed the Hunt' : `Stage ${selectedTeam.currentStage} of ${stagesPerTeam}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTeam(null)}
              style={{
                marginTop: 18,
                width: '100%',
                padding: '10px 0',
                borderRadius: 10,
                border: 0,
                background: 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255,107,53,0.3)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StageBar({ team, stagesPerTeam }: { team: TeamProgress; stagesPerTeam: number }) {
  const stages = Math.max(1, stagesPerTeam)
  const segs = Array.from({ length: stages }, (_, i) => {
    const stageNum = i + 1
    const done = stageNum < team.currentStage || team.status === 'COMPLETED'
    const cur = stageNum === team.currentStage && team.status !== 'COMPLETED'
    const awaiting = cur && team.awaitingVerification
    return { stageNum, done, cur, awaiting }
  })

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {segs.map(s => (
        <div key={s.stageNum} style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              height: 12,
              borderRadius: 6,
              background: s.done ? '#22c55e' : s.awaiting ? '#f59e0b' : s.cur ? '#FF6B35' : '#e2e8f0',
              animation: s.cur && !s.awaiting ? 'glow-seg 1.2s infinite' : 'none',
              boxShadow: s.awaiting ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
              transition: 'background .3s ease',
            }}
          />
          <div
            style={{
              fontSize: 11,
              marginTop: 5,
              color: s.done ? '#15803d' : s.awaiting ? '#b45309' : s.cur ? '#c2410c' : '#94a3b8',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            S{s.stageNum} {s.awaiting && '⏳'}
          </div>
        </div>
      ))}
    </div>
  )
}
