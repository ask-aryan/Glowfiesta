'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface TeamScore {
  id: number
  teamName: string
  leaderName: string | null
  members: string | null
  score: number
  initialOrder?: number
  rank?: number | null
  isTied?: boolean
  isLeader?: boolean
}

interface EventInfo {
  id: number
  name: string
  gameType: string
  status: string
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b', '#06b6d4', '#e11d48']

export default function GiveScorePage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [teams, setTeams] = useState<TeamScore[]>([])
  const [allZero, setAllZero] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [lastDelta, setLastDelta] = useState<{ teamId: number; delta: number; key: number } | null>(null)
  const [customScoreInput, setCustomScoreInput] = useState<Record<number, string>>({})
  const [showManual, setShowManual] = useState<Record<number, boolean>>({})

  // Re-compute ranks dynamically in fixed order so tied teams are treated equally
  function computeRanksForTeams(currentTeams: TeamScore[]) {
    const isAllZero = currentTeams.length === 0 || currentTeams.every(t => t.score === 0)
    if (isAllZero) {
      return {
        isAllZero: true,
        ranked: currentTeams.map((t, i) => ({
          ...t,
          initialOrder: t.initialOrder || i + 1,
          rank: null,
          isTied: false,
          isLeader: false,
        })),
      }
    }

    const uniqueScores = Array.from(new Set(currentTeams.map(t => t.score))).sort((a, b) => b - a)
    const counts = new Map<number, number>()
    currentTeams.forEach(t => counts.set(t.score, (counts.get(t.score) || 0) + 1))

    return {
      isAllZero: false,
      ranked: currentTeams.map((t, i) => {
        const rank = uniqueScores.indexOf(t.score) + 1
        const isTied = (counts.get(t.score) || 1) > 1
        const isLeader = rank === 1 && t.score > 0
        return {
          ...t,
          initialOrder: t.initialOrder || i + 1,
          rank,
          isTied,
          isLeader,
        }
      }),
    }
  }

  const fetchScoreboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/scoreboard`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
        const baseTeams: TeamScore[] = data.teamsInOrder || data.teams || []
        const { isAllZero, ranked } = computeRanksForTeams(baseTeams)
        setAllZero(isAllZero)
        setTeams(ranked)
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchScoreboard()
    const interval = setInterval(fetchScoreboard, 4000)
    return () => clearInterval(interval)
  }, [fetchScoreboard])

  async function handleScoreChange(teamId: number, delta: number) {
    // Optimistic UI update: DO NOT change order, update in-place!
    setTeams(prev => {
      const updated = prev.map(t => (t.id === teamId ? { ...t, score: t.score + delta } : t))
      const { isAllZero, ranked } = computeRanksForTeams(updated)
      setAllZero(isAllZero)
      return ranked
    })
    setLastDelta({ teamId, delta, key: Date.now() })
    setUpdatingId(teamId)

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (!res.ok) {
        await fetchScoreboard()
      }
    } catch {
      await fetchScoreboard()
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleManualSet(teamId: number) {
    const raw = customScoreInput[teamId]
    if (raw === undefined || raw.trim() === '') return
    const scoreVal = parseInt(raw, 10)
    if (isNaN(scoreVal)) return

    // Update in-place without changing order
    setTeams(prev => {
      const updated = prev.map(t => (t.id === teamId ? { ...t, score: scoreVal } : t))
      const { isAllZero, ranked } = computeRanksForTeams(updated)
      setAllZero(isAllZero)
      return ranked
    })
    setUpdatingId(teamId)

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: scoreVal }),
      })
      if (res.ok) {
        setShowManual(prev => ({ ...prev, [teamId]: false }))
        setCustomScoreInput(prev => ({ ...prev, [teamId]: '' }))
      } else {
        await fetchScoreboard()
      }
    } catch {
      await fetchScoreboard()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', marginBottom: 6, fontSize: 13 }}>
            <Link href={`/organizer/events/${eventId}`} style={{ color: '#64748b', textDecoration: 'none' }}>
              {event?.name || 'Event'}
            </Link>
            <span>/</span>
            <span>Scorekeeper</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', margin: 0, color: '#0f172a' }}>
              Give Score · Scorekeeper Panel
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
                background: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #bae6fd',
              }}
            >
              {event?.gameType === 'FUNTAKSHARI' ? '🎵 Funtakshari' : '🧠 Quiz'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Teams remain in fixed order for easy tracking. Click +10, +5, -5, or -10 to award points.
          </div>
        </div>

        {/* Live Projector scoreboard trigger */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href={`/scoreboard/${eventId}`}
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B35, #e8541f)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
            }}
          >
            <span>📺</span> Open Live Projector Scoreboard ↗
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading scorekeeper panel…</div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>No teams added yet</div>
          <div style={{ color: '#64748b', fontSize: 14, margin: '8px 0 20px' }}>
            Add teams first before giving scores.
          </div>
          <Link
            href={`/organizer/events/${eventId}/teams`}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: '#FF6B35',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            + Add Teams Now
          </Link>
        </div>
      ) : (
        /* Team Score Cards Grid: FIXED ORDER (Never shifts) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
          {teams.map((team, idx) => {
            const color = COLORS[idx % COLORS.length]
            const initials = team.teamName.trim().slice(0, 2).toUpperCase()
            const deltaInfo = lastDelta?.teamId === team.id ? lastDelta : null

            // Treat tied leaders equally; if allZero, no one is leader or ranked
            const isLeader = !allZero && Boolean(team.isLeader)
            const isTied = Boolean(team.isTied)

            return (
              <div
                key={team.id}
                style={{
                  background: isLeader ? 'linear-gradient(180deg, #fffdf7 0%, #fffbf0 100%)' : '#ffffff',
                  border: isLeader ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
                  borderRadius: 18,
                  padding: '20px 22px',
                  boxShadow: isLeader ? '0 8px 24px rgba(245,158,11,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color .2s ease, box-shadow .2s ease',
                }}
              >
                {/* Team Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: color,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{team.teamName}</span>
                        {isLeader && <span style={{ fontSize: 16 }} title={isTied ? 'Tied for 1st Place' : '1st Place'}>👑</span>}
                      </div>
                      {team.leaderName && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                          Leader: <strong>{team.leaderName}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rank / Team Number Badge */}
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      background: isLeader ? '#fef3c7' : '#f1f5f9',
                      color: isLeader ? '#b45309' : '#64748b',
                      border: isLeader ? '1px solid #fde68a' : 'none',
                    }}
                  >
                    {allZero
                      ? `Team #${team.initialOrder || idx + 1}`
                      : isLeader
                      ? (isTied ? '👑 #1 TIED LEADER' : '👑 #1 LEADER')
                      : isTied
                      ? `Rank #${team.rank} (Tied)`
                      : `Rank #${team.rank}`}
                  </span>
                </div>

                {/* Members list if available */}
                {team.members && (
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                    👥 {team.members}
                  </div>
                )}

                {/* Score Display Area */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: team.score > 0 ? '#f0fdf4' : team.score < 0 ? '#fef2f2' : '#f8fafc',
                    border: team.score > 0 ? '1.5px solid #bbf7d0' : team.score < 0 ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                    marginBottom: 16,
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Current Score
                    </div>
                    <div
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineHeight: 1,
                        marginTop: 4,
                        color: team.score > 0 ? '#15803d' : team.score < 0 ? '#dc2626' : '#334155',
                      }}
                    >
                      {team.score > 0 ? `+${team.score}` : team.score}
                    </div>
                  </div>

                  {/* Reaction Flash Pill */}
                  {deltaInfo && (
                    <div
                      key={deltaInfo.key}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontWeight: 800,
                        fontSize: 14,
                        background: deltaInfo.delta > 0 ? '#22c55e' : '#ef4444',
                        color: '#fff',
                        boxShadow: deltaInfo.delta > 0 ? '0 4px 12px rgba(34,197,94,0.4)' : '0 4px 12px rgba(239,68,68,0.4)',
                        animation: 'pop .4s ease both',
                      }}
                    >
                      {deltaInfo.delta > 0 ? `+${deltaInfo.delta} 😄` : `${deltaInfo.delta} 😢`}
                    </div>
                  )}
                </div>

                {/* Quick Score Delta Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {/* +10 Button */}
                  <button
                    onClick={() => handleScoreChange(team.id, 10)}
                    disabled={updatingId === team.id}
                    title="Add 10 points"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: 0,
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                      transition: 'transform .1s ease, filter .1s ease',
                    }}
                    onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
                    onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                  >
                    +10
                  </button>

                  {/* +5 Button */}
                  <button
                    onClick={() => handleScoreChange(team.id, 5)}
                    disabled={updatingId === team.id}
                    title="Add 5 points"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: 0,
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                      transition: 'transform .1s ease, filter .1s ease',
                    }}
                    onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
                    onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                  >
                    +5
                  </button>

                  {/* -5 Button */}
                  <button
                    onClick={() => handleScoreChange(team.id, -5)}
                    disabled={updatingId === team.id}
                    title="Subtract 5 points"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: 0,
                      background: 'linear-gradient(135deg, #d97706, #b45309)',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                      transition: 'transform .1s ease, filter .1s ease',
                    }}
                    onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
                    onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                  >
                    -5
                  </button>

                  {/* -10 Button */}
                  <button
                    onClick={() => handleScoreChange(team.id, -10)}
                    disabled={updatingId === team.id}
                    title="Subtract 10 points"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: 0,
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                      transition: 'transform .1s ease, filter .1s ease',
                    }}
                    onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
                    onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                  >
                    -10
                  </button>
                </div>

                {/* Manual set toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <button
                    onClick={() => setShowManual(p => ({ ...p, [team.id]: !p[team.id] }))}
                    style={{
                      background: 'none',
                      border: 0,
                      color: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showManual[team.id] ? '▲ Hide manual override' : '▼ Custom score / reset'}
                  </button>

                  <button
                    onClick={() => handleScoreChange(team.id, -team.score)}
                    style={{
                      background: 'none',
                      border: 0,
                      color: '#94a3b8',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Reset to 0
                  </button>
                </div>

                {/* Manual input panel */}
                {showManual[team.id] && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={customScoreInput[team.id] ?? ''}
                      onChange={e => setCustomScoreInput(prev => ({ ...prev, [team.id]: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleManualSet(team.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: 0,
                        background: '#0f172a',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
