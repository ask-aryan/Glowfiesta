'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

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
  description: string | null
  gameType: string
  status: string
}

const COLORS = [
  '#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#f59e0b', '#06b6d4', '#e11d48', '#84cc16', '#a855f7',
  '#14b8a6', '#6366f1', '#f97316', '#0ea5e9', '#d946ef'
]

export default function ScoreboardPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [teams, setTeams] = useState<TeamScore[]>([])
  const [allZero, setAllZero] = useState(true)
  const [loading, setLoading] = useState(true)
  const [reactions, setReactions] = useState<Record<number, { type: 'HAPPY' | 'CRYING'; delta: number; key: number }>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const prevScoresRef = useRef<Record<number, number>>({})

  const fetchScoreboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/scoreboard`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)

        const incomingTeams: TeamScore[] = data.teams || []
        const isAllZero = Boolean(data.allZero ?? (incomingTeams.length === 0 || incomingTeams.every(t => t.score === 0)))
        setAllZero(isAllZero)

        const newReactions: Record<number, { type: 'HAPPY' | 'CRYING'; delta: number; key: number }> = {}

        incomingTeams.forEach(t => {
          const prev = prevScoresRef.current[t.id]
          if (prev !== undefined && prev !== t.score) {
            const diff = t.score - prev
            if (diff > 0) {
              newReactions[t.id] = { type: 'HAPPY', delta: diff, key: Date.now() + t.id }
            } else if (diff < 0) {
              newReactions[t.id] = { type: 'CRYING', delta: diff, key: Date.now() + t.id }
            }
          }
          prevScoresRef.current[t.id] = t.score
        })

        if (Object.keys(newReactions).length > 0) {
          setReactions(prev => ({ ...prev, ...newReactions }))
          setTimeout(() => {
            setReactions(current => {
              const cleaned = { ...current }
              Object.keys(newReactions).forEach(id => {
                delete cleaned[Number(id)]
              })
              return cleaned
            })
          }, 4500)
        }

        setTeams(incomingTeams)
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchScoreboard()
    const interval = setInterval(fetchScoreboard, 1800)
    return () => clearInterval(interval)
  }, [fetchScoreboard])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Calculate optimal grid layout so all teams fit on a single screen without scrolling
  const count = teams.length
  let columns = 1
  if (count > 10) columns = 3
  else if (count > 4) columns = 2
  else columns = count > 2 ? 2 : 1

  const rowsPerCol = Math.ceil(count / columns) || 1
  const isCompact = count > 6
  const isVeryCompact = count > 10

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 25%, #20083b 0%, #0d0218 60%, #05010a 100%)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: isVeryCompact ? '12px 18px' : isCompact ? '14px 22px' : '18px 28px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Background ambient lighting */}
      <div style={{ position: 'absolute', top: -80, left: '25%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 120, right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Sleek Compact Header Bar (Fits on single TV screen) ───────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          paddingBottom: isVeryCompact ? 8 : 12,
          marginBottom: isVeryCompact ? 8 : 12,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: isVeryCompact ? 38 : 44,
              height: isVeryCompact ? 38 : 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: isVeryCompact ? 18 : 22,
              boxShadow: '0 0 18px rgba(255,107,53,0.5)',
              flexShrink: 0,
            }}
          >
            {event?.gameType === 'FUNTAKSHARI' ? '🎵' : '🧠'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 800,
                  fontSize: isVeryCompact ? 22 : isCompact ? 26 : 30,
                  letterSpacing: '-.01em',
                  margin: 0,
                  background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 50%, #FFA23A 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 2px 10px rgba(255,200,87,0.3))',
                  lineHeight: 1.1,
                }}
              >
                {event?.name || 'Live Scoreboard'}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(255,107,53,0.2)',
                  color: '#FFC857',
                  border: '1px solid rgba(255,200,87,0.4)',
                }}
              >
                {event?.gameType === 'FUNTAKSHARI' ? 'FUNTAKSHARI' : 'QUIZ BATTLE'}
              </span>
            </div>
            <div style={{ color: '#ffd9b8', fontSize: isVeryCompact ? 11 : 12, marginTop: 2 }}>
              GlowFiesta 2026 Championship · Single-Screen Live Leaderboard
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: isVeryCompact ? '4px 10px' : '6px 14px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#4ade80',
              fontWeight: 800,
              fontSize: isVeryCompact ? 11 : 12,
              letterSpacing: '.06em',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                animation: 'pulse-ring 1.6s infinite',
              }}
            />
            LIVE TV
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: isVeryCompact ? '5px 12px' : '7px 14px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'background .15s ease',
            }}
          >
            <span>{isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* ── Starting Banner (Only when all teams are at 0) ─────────────── */}
      {allZero && !loading && teams.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: isVeryCompact ? '6px 14px' : '8px 18px',
            borderRadius: 12,
            background: 'rgba(255,200,87,0.1)',
            border: '1px solid rgba(255,200,87,0.3)',
            color: '#fff0b3',
            fontSize: isVeryCompact ? 12 : 13,
            fontWeight: 600,
            marginBottom: isVeryCompact ? 8 : 12,
            flexShrink: 0,
          }}
        >
          🏁 All teams are ready at the starting line (0 pts). Leaderboard rankings will begin as soon as Round 1 points are awarded!
        </div>
      )}

      {/* ── Content Viewport (Fits 100% of height without scrollbar) ─── */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 18, color: '#ffd9b8' }}>
            Connecting to live scoreboard…
          </div>
        ) : teams.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFC857' }}>Waiting for teams to register…</div>
            <div style={{ color: '#ffd9b8', marginTop: 6, fontSize: 14 }}>Scores will appear here live once teams are added.</div>
          </div>
        ) : (
          /* Grid of Teams: Fills entire height with 0 scrolling */
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridTemplateRows: `repeat(${rowsPerCol}, 1fr)`,
              gap: isVeryCompact ? 8 : isCompact ? 10 : 12,
            }}
          >
            {teams.map((team, idx) => {
              const reaction = reactions[team.id]
              const color = COLORS[idx % COLORS.length]

              return (
                <SingleScreenTeamCard
                  key={team.id}
                  team={team}
                  allZero={allZero}
                  color={color}
                  reaction={reaction}
                  isCompact={isCompact}
                  isVeryCompact={isVeryCompact}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Single-Screen TV Team Card Component ───────────────────────────────────
function SingleScreenTeamCard({
  team,
  allZero,
  color,
  reaction,
  isCompact,
  isVeryCompact,
}: {
  team: TeamScore
  allZero: boolean
  color: string
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
  isCompact: boolean
  isVeryCompact: boolean
}) {
  const isHappy = reaction?.type === 'HAPPY'
  const isCrying = reaction?.type === 'CRYING'

  // Tied teams are treated equally
  const isLeader = !allZero && Boolean(team.isLeader)
  const isTied = Boolean(team.isTied)
  const rank = team.rank

  const emotionEmoji = isHappy
    ? '🥳'
    : isCrying
    ? '😭'
    : allZero
    ? '🙂'
    : rank === 1
    ? '🤩'
    : rank === 2
    ? '😊'
    : rank === 3
    ? '😄'
    : '🙂'

  const rankColor = allZero
    ? '#94a3b8'
    : rank === 1
    ? '#FFC857'
    : rank === 2
    ? '#38bdf8'
    : rank === 3
    ? '#fb923c'
    : '#94a3b8'

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: isVeryCompact ? '52px 42px minmax(0, 1fr) auto' : isCompact ? '60px 48px minmax(0, 1fr) auto' : '70px 56px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: isVeryCompact ? 8 : 12,
        padding: isVeryCompact ? '6px 12px' : isCompact ? '8px 16px' : '12px 20px',
        borderRadius: isVeryCompact ? 12 : 16,
        background: isHappy
          ? 'linear-gradient(90deg, rgba(22,163,74,0.35) 0%, rgba(22,163,74,0.18) 100%)'
          : isCrying
          ? 'linear-gradient(90deg, rgba(185,28,28,0.35) 0%, rgba(185,28,28,0.18) 100%)'
          : isLeader
          ? 'linear-gradient(90deg, rgba(255,200,87,0.2) 0%, rgba(255,107,53,0.14) 100%)'
          : 'rgba(255,255,255,0.06)',
        border: isHappy
          ? '2px solid #22c55e'
          : isCrying
          ? '2px solid #ef4444'
          : isLeader
          ? '2px solid #FFC857'
          : rank === 2 && !allZero
          ? '1.5px solid #38bdf8'
          : rank === 3 && !allZero
          ? '1.5px solid #fb923c'
          : '1px solid rgba(255,255,255,0.12)',
        boxShadow: isHappy
          ? '0 0 20px rgba(34,197,94,0.4)'
          : isCrying
          ? '0 0 20px rgba(239,68,68,0.4)'
          : isLeader
          ? '0 0 20px rgba(255,200,87,0.25)'
          : 'none',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'transform .2s ease, border-color .2s ease',
      }}
    >
      {/* 1. Rank or Team Number */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: isVeryCompact ? 15 : isCompact ? 18 : 22,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: rankColor,
            lineHeight: 1,
          }}
        >
          {allZero ? `T-${team.initialOrder || '•'}` : `#${rank}`}
        </div>
        {!allZero && isTied && (
          <div style={{ fontSize: 9, color: '#ffd9b8', fontWeight: 700, marginTop: 2 }}>
            TIED
          </div>
        )}
      </div>

      {/* 2. Animated Emotion Avatar (Reacts to score changes) */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: isVeryCompact ? 36 : isCompact ? 42 : 48,
            height: isVeryCompact ? 36 : isCompact ? 42 : 48,
            borderRadius: '50%',
            background: isHappy ? '#16a34a' : isCrying ? '#991b1b' : color,
            display: 'grid',
            placeItems: 'center',
            fontSize: isVeryCompact ? 20 : isCompact ? 22 : 26,
            boxShadow: `0 0 12px ${color}55`,
            animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
            flexShrink: 0,
          }}
        >
          {emotionEmoji}
        </div>
      </div>

      {/* 3. Team Details (Truncated to never break card height) */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          <span
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 800,
              fontSize: isVeryCompact ? 15 : isCompact ? 17 : 20,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.15,
            }}
          >
            {team.teamName}
          </span>
          {isLeader && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.05em',
                padding: '1px 6px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                color: '#fff',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              👑 {isTied ? 'TIED #1' : '#1'}
            </span>
          )}
        </div>

        {(team.leaderName || team.members) && (
          <div
            style={{
              color: '#ffd9b8',
              fontSize: isVeryCompact ? 10 : 11,
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: 0.9,
            }}
          >
            {team.leaderName && <strong>{team.leaderName}</strong>}
            {team.leaderName && team.members && <span> · </span>}
            {team.members && <span>{team.members}</span>}
          </div>
        )}
      </div>

      {/* 4. Score & Instant Reaction Pop */}
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        {reaction && (
          <span
            key={reaction.key}
            style={{
              fontSize: isVeryCompact ? 11 : 12,
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: 999,
              background: isHappy ? '#22c55e' : '#ef4444',
              color: '#fff',
              animation: 'pop .35s both',
              boxShadow: isHappy ? '0 0 10px rgba(34,197,94,0.6)' : '0 0 10px rgba(239,68,68,0.6)',
              whiteSpace: 'nowrap',
            }}
          >
            {isHappy ? `+${reaction.delta} 😄` : `${reaction.delta} 😢`}
          </span>
        )}

        <div
          style={{
            fontSize: isVeryCompact ? 24 : isCompact ? 28 : 34,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: team.score > 0 ? '#4ade80' : team.score < 0 ? '#f87171' : '#cbd5e1',
            letterSpacing: '-.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {team.score > 0 ? `+${team.score}` : team.score}
          <span style={{ fontSize: isVeryCompact ? 11 : 13, fontWeight: 700, marginLeft: 3, color: '#ffd9b8' }}>
            pts
          </span>
        </div>
      </div>
    </div>
  )
}
