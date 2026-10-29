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

interface HistoryAction {
  teamId: number
  teamName: string
  prevScore: number
  newScore: number
  label: string
}

const COLORS = [
  '#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#f59e0b', '#06b6d4', '#e11d48', '#84cc16', '#a855f7',
  '#14b8a6', '#6366f1', '#f97316', '#0ea5e9', '#d946ef'
]

export default function GiveScorePage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [teams, setTeams] = useState<TeamScore[]>([])
  const [allZero, setAllZero] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [lastDelta, setLastDelta] = useState<{ teamId: number; delta: number; key: number } | null>(null)
  const [history, setHistory] = useState<HistoryAction[]>([])
  const [undoLoading, setUndoLoading] = useState(false)
  const [undoToast, setUndoToast] = useState<string | null>(null)
  const [showManual, setShowManual] = useState<Record<number, boolean>>({})
  const [customScoreInput, setCustomScoreInput] = useState<Record<number, string>>({})

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
    const targetTeam = teams.find(t => t.id === teamId)
    if (targetTeam) {
      // Record action in undo stack
      setHistory(prev => [
        ...prev,
        {
          teamId,
          teamName: targetTeam.teamName,
          prevScore: targetTeam.score,
          newScore: targetTeam.score + delta,
          label: `${delta > 0 ? '+' + delta : delta} to ${targetTeam.teamName}`,
        },
      ])
    }

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

  async function handleUndo() {
    if (history.length === 0 || undoLoading) return
    const lastAction = history[history.length - 1]
    setUndoLoading(true)

    // Remove last action from stack
    setHistory(prev => prev.slice(0, -1))

    // Optimistically revert score in-place
    setTeams(prev => {
      const updated = prev.map(t => (t.id === lastAction.teamId ? { ...t, score: lastAction.prevScore } : t))
      const { isAllZero, ranked } = computeRanksForTeams(updated)
      setAllZero(isAllZero)
      return ranked
    })

    setUndoToast(`↶ Reverted ${lastAction.teamName} to ${lastAction.prevScore} pts`)
    setTimeout(() => setUndoToast(null), 3000)

    try {
      await fetch(`/api/organizer/events/${eventId}/teams/${lastAction.teamId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: lastAction.prevScore }),
      })
    } catch {
      await fetchScoreboard()
    } finally {
      setUndoLoading(false)
    }
  }

  async function handleManualSet(teamId: number) {
    const raw = customScoreInput[teamId]
    if (raw === undefined || raw.trim() === '') return
    const scoreVal = parseInt(raw, 10)
    if (isNaN(scoreVal)) return

    const targetTeam = teams.find(t => t.id === teamId)
    if (targetTeam) {
      setHistory(prev => [
        ...prev,
        {
          teamId,
          teamName: targetTeam.teamName,
          prevScore: targetTeam.score,
          newScore: scoreVal,
          label: `Set to ${scoreVal} on ${targetTeam.teamName}`,
        },
      ])
    }

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

  // Calculate grid layout so at least 6 teams (and up to 12) fit on the same screen without scrolling
  const count = teams.length
  let columns = 3
  if (count <= 2) columns = 2
  else if (count > 8) columns = 3
  else columns = 3

  const rows = Math.ceil(count / columns) || 1
  const lastAction = history[history.length - 1]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        maxHeight: 'calc(100vh - 56px)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Compact Header & Action Bar ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-.02em' }}>
            Scorekeeper Panel
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: event?.gameType === 'FUNTAKSHARI' ? '#fdf2f8' : '#e0f2fe',
              color: event?.gameType === 'FUNTAKSHARI' ? '#be185d' : '#0369a1',
              border: `1px solid ${event?.gameType === 'FUNTAKSHARI' ? '#fbcfe8' : '#bae6fd'}`,
            }}
          >
            {event?.gameType === 'FUNTAKSHARI' ? '🎵 Funtakshari' : '🧠 Quiz'}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            ({teams.length} teams in fixed order)
          </span>
        </div>

        {/* Action Controls: Undo Button & Live Scoreboard Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Undo Notification Pill */}
          {undoToast && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#15803d',
                background: '#dcfce7',
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid #86efac',
                animation: 'pop .3s ease',
              }}
            >
              {undoToast}
            </span>
          )}

          {/* Sequential Undo Button */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || undoLoading}
            title={lastAction ? `Undo: ${lastAction.label}` : 'No actions to undo'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: history.length > 0 ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
              background: history.length > 0 ? '#ffffff' : '#f8fafc',
              color: history.length > 0 ? '#1e293b' : '#94a3b8',
              fontWeight: 700,
              fontSize: 13,
              cursor: history.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: history.length > 0 ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all .15s ease',
            }}
          >
            <span style={{ fontSize: 16 }}>↶</span>
            <span>Undo {history.length > 0 && `(${history.length})`}</span>
          </button>

          {/* Live Scoreboard Trigger */}
          <Link
            href={`/scoreboard/${eventId}`}
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #FF6B35, #e8541f)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(255,107,53,0.35)',
            }}
          >
            <span>📺</span> Projector View ↗
          </Link>
        </div>
      </div>

      {/* ── Main Viewport Area (Zero Scroll for 6+ teams) ────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#64748b' }}>
            Loading scorekeeper panel…
          </div>
        ) : teams.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>No teams added yet</div>
            <div style={{ color: '#64748b', fontSize: 13, margin: '6px 0 16px' }}>Add teams first to begin scoring.</div>
            <Link
              href={`/organizer/events/${eventId}/teams`}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#FF6B35',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              + Add Teams
            </Link>
          </div>
        ) : (
          /* Grid of Team Cards: Scaled to fit 100% of height with zero scrolling */
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap: 10,
            }}
          >
            {teams.map((team, idx) => {
              const color = COLORS[idx % COLORS.length]
              const initials = team.teamName.trim().slice(0, 2).toUpperCase()
              const deltaInfo = lastDelta?.teamId === team.id ? lastDelta : null

              const isLeader = !allZero && Boolean(team.isLeader)
              const isTied = Boolean(team.isTied)

              return (
                <div
                  key={team.id}
                  style={{
                    height: '100%',
                    minHeight: 0,
                    background: isLeader ? 'linear-gradient(180deg, #fffdf7 0%, #fffbf0 100%)' : '#ffffff',
                    border: isLeader ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '10px 14px',
                    boxShadow: isLeader ? '0 4px 14px rgba(245,158,11,0.16)' : '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Top Line: Team Avatar, Name, and Rank */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: color,
                          color: '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </span>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{team.teamName}</span>
                          {isLeader && <span style={{ fontSize: 14 }}>👑</span>}
                        </div>
                        {team.leaderName && (
                          <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {team.leaderName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: isLeader ? '#fef3c7' : '#f1f5f9',
                        color: isLeader ? '#b45309' : '#64748b',
                        border: isLeader ? '1px solid #fde68a' : 'none',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {allZero
                        ? `Team #${team.initialOrder || idx + 1}`
                        : isLeader
                        ? (isTied ? '👑 #1 TIED' : '👑 #1')
                        : isTied
                        ? `#${team.rank} Tied`
                        : `#${team.rank}`}
                    </span>
                  </div>

                  {/* Middle Line: Current Score & Flash Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: team.score > 0 ? '#15803d' : team.score < 0 ? '#dc2626' : '#334155',
                          lineHeight: 1,
                        }}
                      >
                        {team.score > 0 ? `+${team.score}` : team.score}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>pts</span>
                    </div>

                    {/* Flash Delta Pill */}
                    {deltaInfo && (
                      <span
                        key={deltaInfo.key}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 800,
                          fontSize: 11,
                          background: deltaInfo.delta > 0 ? '#22c55e' : '#ef4444',
                          color: '#fff',
                          animation: 'pop .3s ease both',
                        }}
                      >
                        {deltaInfo.delta > 0 ? `+${deltaInfo.delta} 😄` : `${deltaInfo.delta} 😢`}
                      </span>
                    )}

                    {/* Quick Manual Override Trigger */}
                    <button
                      onClick={() => setShowManual(p => ({ ...p, [team.id]: !p[team.id] }))}
                      style={{
                        background: 'none',
                        border: 0,
                        color: '#94a3b8',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {showManual[team.id] ? 'Cancel' : 'Set custom'}
                    </button>
                  </div>

                  {/* Manual input panel (only if toggled) */}
                  {showManual[team.id] && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <input
                        type="number"
                        placeholder="New score"
                        value={customScoreInput[team.id] ?? ''}
                        onChange={e => setCustomScoreInput(prev => ({ ...prev, [team.id]: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleManualSet(team.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 0,
                          background: '#0f172a',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Bottom Line: 4 Action Buttons (+10, +5, -5, -10) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    <button
                      onClick={() => handleScoreChange(team.id, 10)}
                      disabled={updatingId === team.id}
                      title="Add 10 points"
                      style={{
                        height: 38,
                        borderRadius: 8,
                        border: 0,
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
                        transition: 'transform .1s ease',
                      }}
                      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.94)')}
                      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                    >
                      +10
                    </button>

                    <button
                      onClick={() => handleScoreChange(team.id, 5)}
                      disabled={updatingId === team.id}
                      title="Add 5 points"
                      style={{
                        height: 38,
                        borderRadius: 8,
                        border: 0,
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                        transition: 'transform .1s ease',
                      }}
                      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.94)')}
                      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                    >
                      +5
                    </button>

                    <button
                      onClick={() => handleScoreChange(team.id, -5)}
                      disabled={updatingId === team.id}
                      title="Subtract 5 points"
                      style={{
                        height: 38,
                        borderRadius: 8,
                        border: 0,
                        background: 'linear-gradient(135deg, #d97706, #b45309)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(217,119,6,0.25)',
                        transition: 'transform .1s ease',
                      }}
                      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.94)')}
                      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                    >
                      -5
                    </button>

                    <button
                      onClick={() => handleScoreChange(team.id, -10)}
                      disabled={updatingId === team.id}
                      title="Subtract 10 points"
                      style={{
                        height: 38,
                        borderRadius: 8,
                        border: 0,
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
                        transition: 'transform .1s ease',
                      }}
                      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.94)')}
                      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                    >
                      -10
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
