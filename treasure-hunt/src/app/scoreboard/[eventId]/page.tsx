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
  isEliminated?: boolean
  eliminatedRound?: number | null
}

interface EventInfo {
  id: number
  name: string
  description: string | null
  gameType: string
  status: string
  currentRound?: number
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
  const [eliminatedTeams, setEliminatedTeams] = useState<TeamScore[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
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

        const incomingTeams: TeamScore[] = data.aliveTeams || data.teams || []
        const isAllZero = Boolean(data.allZero ?? (incomingTeams.length === 0 || incomingTeams.every(t => t.score === 0)))
        setAllZero(isAllZero)
        setEliminatedTeams(data.eliminatedTeams || [])
        setTotalCount(data.totalCount || incomingTeams.length + (data.eliminatedTeams?.length || 0))

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

  const showPodium = !allZero && teams.length > 3
  const top3 = teams.slice(0, 3)

  // Calculate grid layout for bottom cards so all fit without scroll
  const count = teams.length
  let columns = 1
  if (count > 8) columns = 3
  else if (count > 3) columns = 2
  else columns = count > 1 ? 2 : 1

  const rows = Math.ceil(count / columns) || 1

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 25%, #20083b 0%, #0d0218 60%, #05010a 100%)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '14px 24px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Background ambient lighting */}
      <div style={{ position: 'absolute', top: -80, left: '25%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 120, right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Sleek Compact Header Bar ───────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 18,
              boxShadow: '0 0 16px rgba(255,107,53,0.5)',
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
                  fontSize: 24,
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

              {/* Round Badge */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(255,200,87,0.25), rgba(255,107,53,0.2))',
                  color: '#FFC857',
                  border: '1px solid rgba(255,200,87,0.5)',
                  letterSpacing: '.04em',
                }}
              >
                🎯 ROUND {event?.currentRound || 1}
              </span>
            </div>
            <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 2 }}>
              GlowFiesta 2026 Championship
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Active Teams Count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#86efac',
              fontWeight: 800,
              fontSize: 11,
            }}
          >
            👥 {teams.length} ALIVE
          </div>

          {/* Eliminated Teams Count if any */}
          {eliminatedTeams.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#fca5a5',
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              🪦 {eliminatedTeams.length} RIP
            </div>
          )}

          {/* Live Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#4ade80',
              fontWeight: 800,
              fontSize: 12,
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
              padding: '6px 14px',
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
            padding: '7px 16px',
            borderRadius: 12,
            background: 'rgba(255,200,87,0.1)',
            border: '1px solid rgba(255,200,87,0.3)',
            color: '#fff0b3',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          🏁 All teams are ready at the starting line (0 pts). The podium & leaderboard ranks will activate on the first score!
        </div>
      )}

      {/* ── Main Viewport Container (Fits 100vh with Zero Scrolling) ── */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          <>
            {/* ── Top 3 Rank Podium (Brought Back & Proportioned for TV) ── */}
            {showPodium && (
              <section
                style={{
                  height: '40%',
                  maxHeight: '340px',
                  minHeight: '210px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: 16,
                  maxWidth: 880,
                  width: '100%',
                  margin: '0 auto',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 5,
                }}
              >
                {/* Rank 2 (Silver) */}
                <TVPodiumCard
                  team={top3[1]}
                  place={top3[1]?.rank ?? 2}
                  reaction={reactions[top3[1]?.id]}
                  color={top3[1]?.rank === 1 ? '#FFC857' : '#38bdf8'}
                  isLeader={top3[1]?.rank === 1}
                  baseHeight={100}
                />

                {/* Rank 1 (Gold with 👑) */}
                <TVPodiumCard
                  team={top3[0]}
                  place={top3[0]?.rank ?? 1}
                  reaction={reactions[top3[0]?.id]}
                  color="#FFC857"
                  isLeader
                  baseHeight={140}
                />

                {/* Rank 3 (Bronze) */}
                <TVPodiumCard
                  team={top3[2]}
                  place={top3[2]?.rank ?? 3}
                  reaction={reactions[top3[2]?.id]}
                  color={top3[2]?.rank === 1 ? '#FFC857' : top3[2]?.rank === 2 ? '#38bdf8' : '#fb923c'}
                  isLeader={top3[2]?.rank === 1}
                  baseHeight={75}
                />
              </section>
            )}

            {/* ── Main Competition Viewport ──────────────────────────────── */}
            {teams.length === 3 ? (
              <TVThreeTeamsGraphView
                teams={teams}
                allZero={allZero}
                reactions={reactions}
              />
            ) : teams.length === 2 ? (
              <TVDuelBattleView
                teams={teams}
                allZero={allZero}
                reactions={reactions}
              />
            ) : teams.length === 1 ? (
              <TVChampionView
                team={teams[0]}
                reaction={reactions[teams[0].id]}
              />
            ) : (
              <section
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gap: 8,
                }}
              >
                {teams.map((team, idx) => {
                  const reaction = reactions[team.id]
                  const color = COLORS[idx % COLORS.length]

                  return (
                    <TVTeamCard
                      key={team.id}
                      team={team}
                      allZero={allZero}
                      color={color}
                      reaction={reaction}
                    />
                  )
                })}
              </section>
            )}

            {/* ── Compact Eliminated Teams Strip (RIP) ────────────────────── */}
            {eliminatedTeams.length > 0 && (
              <section
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 12,
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  overflowX: 'auto',
                  marginTop: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 11, fontWeight: 900, letterSpacing: '.08em', color: '#f87171', textTransform: 'uppercase' }}>
                  <span style={{ fontSize: 14 }}>🪦</span>
                  <span>ELIMINATED (RIP)</span>
                </div>
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
                  {eliminatedTeams.map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 7,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: 12,
                        color: '#cbd5e1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>☠️</span>
                      <span style={{ fontWeight: 700, textDecoration: 'line-through', opacity: 0.85 }}>{t.teamName}</span>
                      <span style={{ color: '#f87171', fontWeight: 800, fontSize: 11 }}>{t.score} pts</span>
                      <span style={{ fontSize: 10, color: '#64748b' }}>(R{t.eliminatedRound || 1})</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ── Cool TV Rank Podium Pillar Component ───────────────────────────────────
function TVPodiumCard({
  team,
  place,
  reaction,
  color,
  isLeader = false,
  baseHeight,
}: {
  team: TeamScore
  place: number
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
  color: string
  isLeader?: boolean
  baseHeight: number
}) {
  if (!team) return null

  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
  const isHappy = reaction?.type === 'HAPPY'
  const isCrying = reaction?.type === 'CRYING'

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 260,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        textAlign: 'center',
        position: 'relative',
        transition: 'transform .3s ease',
        transform: isHappy ? 'translateY(-6px) scale(1.02)' : isCrying ? 'translateY(3px)' : 'none',
      }}
    >
      {/* Reaction Speech Bubble */}
      {reaction && (
        <div
          key={reaction.key}
          style={{
            position: 'absolute',
            top: -24,
            background: isHappy ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 13,
            padding: '4px 12px',
            borderRadius: 999,
            boxShadow: isHappy ? '0 0 16px rgba(34,197,94,0.8)' : '0 0 16px rgba(239,68,68,0.8)',
            animation: 'pop .4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            zIndex: 30,
            whiteSpace: 'nowrap',
          }}
        >
          {isHappy ? `+${reaction.delta} pts! 🥳` : `${reaction.delta} pts! 😭`}
        </div>
      )}

      {/* Avatar with Medal */}
      <div
        style={{
          width: isLeader ? 58 : 48,
          height: isLeader ? 58 : 48,
          borderRadius: '50%',
          background: isHappy ? '#16a34a' : isCrying ? '#991b1b' : 'rgba(255,255,255,0.12)',
          border: `3px solid ${isHappy ? '#4ade80' : isCrying ? '#f87171' : color}`,
          display: 'grid',
          placeItems: 'center',
          fontSize: isLeader ? 28 : 22,
          marginBottom: 6,
          boxShadow: isLeader ? `0 0 24px ${color}88` : '0 4px 14px rgba(0,0,0,0.4)',
          position: 'relative',
          animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
          flexShrink: 0,
        }}
      >
        <span>{isHappy ? '😄' : isCrying ? '😭' : medal}</span>
        <span
          style={{
            position: 'absolute',
            bottom: -5,
            background: color,
            color: '#000',
            fontWeight: 900,
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 999,
          }}
        >
          #{place} {team.isTied && '(Tied)'}
        </span>
      </div>

      {/* Team Details */}
      <div
        style={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 800,
          fontSize: isLeader ? 16 : 14,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          marginBottom: 4,
          flexShrink: 0,
        }}
      >
        {team.teamName}
      </div>

      {/* 3D Podium Pillar */}
      <div
        style={{
          width: '100%',
          height: baseHeight,
          background: isLeader
            ? 'linear-gradient(180deg, rgba(255,200,87,0.38) 0%, rgba(255,107,53,0.18) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 100%)',
          border: `2px solid ${color}aa`,
          borderRadius: '14px 14px 4px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: isLeader ? 34 : 26,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
            color: isLeader ? '#FFC857' : '#fff',
            textShadow: `0 0 14px ${color}`,
          }}
        >
          {team.score > 0 ? `+${team.score}` : team.score}
        </div>
        <div style={{ fontSize: 10, color: '#ffd9b8', fontWeight: 700, letterSpacing: '.06em' }}>PTS</div>
      </div>
    </div>
  )
}

// ── Single-Screen TV Team Card Component (Bottom Grid) ────────────────────
function TVTeamCard({
  team,
  allZero,
  color,
  reaction,
}: {
  team: TeamScore
  allZero: boolean
  color: string
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
}) {
  const isHappy = reaction?.type === 'HAPPY'
  const isCrying = reaction?.type === 'CRYING'

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
        gridTemplateColumns: '50px 42px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px',
        borderRadius: 14,
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
          ? '0 0 16px rgba(34,197,94,0.4)'
          : isCrying
          ? '0 0 16px rgba(239,68,68,0.4)'
          : isLeader
          ? '0 0 16px rgba(255,200,87,0.25)'
          : 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform .2s ease, border-color .2s ease',
      }}
    >
      {/* 1. Rank */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: !allZero && rank && rank <= 3 ? 18 : 15,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: rankColor,
            lineHeight: 1,
          }}
        >
          {allZero ? `T-${team.initialOrder || '•'}` : `#${rank}`}
        </div>
        {!allZero && isTied && (
          <div style={{ fontSize: 9, color: '#ffd9b8', fontWeight: 700, marginTop: 1 }}>
            TIED
          </div>
        )}
      </div>

      {/* 2. Reaction Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isHappy ? '#16a34a' : isCrying ? '#991b1b' : color,
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
            boxShadow: `0 0 10px ${color}55`,
            animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
            flexShrink: 0,
          }}
        >
          {emotionEmoji}
        </div>
      </div>

      {/* 3. Team Details */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          <span
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 800,
              fontSize: 16,
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
              fontSize: 10,
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

      {/* 4. Score */}
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        {reaction && (
          <span
            key={reaction.key}
            style={{
              fontSize: 11,
              fontWeight: 900,
              padding: '2px 7px',
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
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: team.score > 0 ? '#4ade80' : team.score < 0 ? '#f87171' : '#cbd5e1',
            letterSpacing: '-.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {team.score > 0 ? `+${team.score}` : team.score}
          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 2, color: '#ffd9b8' }}>
            pts
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Dynamic 3-Team Score Graph Arena Component (Bars Rise & Drop with Score) ──
function TVThreeTeamsGraphView({
  teams,
  allZero,
  reactions,
}: {
  teams: TeamScore[]
  allZero: boolean
  reactions: Record<number, { type: 'HAPPY' | 'CRYING'; delta: number; key: number }>
}) {
  if (teams.length < 3) return null

  // Stable fixed column positions: keep each team at their fixed position so bars don't teleport!
  const stableTeams = [...teams].sort((a, b) => (a.initialOrder ?? a.id) - (b.initialOrder ?? b.id))

  const scores = teams.map(t => t.score)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const scoreSpread = maxScore - minScore

  // Reference ceiling: at least 15 points spread or 15 points from 0
  const effectiveCeiling = allZero ? 10 : Math.max(15, maxScore, scoreSpread * 1.25)
  const effectiveFloor = allZero ? 0 : Math.min(0, minScore)
  const range = Math.max(10, effectiveCeiling - effectiveFloor)

  const isTied = !allZero && teams.filter(t => t.score === maxScore).length > 1

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0 0',
        maxWidth: 1060,
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Graph Arena Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '5px 20px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(255, 200, 87, 0.25), rgba(255, 107, 53, 0.2))',
          border: '1.5px solid rgba(255, 200, 87, 0.5)',
          boxShadow: '0 0 20px rgba(255, 200, 87, 0.25)',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16 }}>📊</span>
        <span
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: '#FFC857',
          }}
        >
          Top 3 Championship Race · Live Score Graph
        </span>
        <span style={{ fontSize: 16 }}>📈</span>
      </div>

      {/* Main Score Graph Area with Dynamic Height Pillars */}
      <div
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 20,
          position: 'relative',
          paddingBottom: 4,
        }}
      >
        {/* Background Grid Reference Lines */}
        <div
          style={{
            position: 'absolute',
            inset: '30px 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: 0.25,
          }}
        >
          <div style={{ borderBottom: '1px dashed #FFC857', width: '100%' }} />
          <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.4)', width: '100%' }} />
          <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.4)', width: '100%' }} />
          <div style={{ borderBottom: '1.5px solid rgba(255,255,255,0.6)', width: '100%' }} />
        </div>

        {/* 3 Dynamic Graph Columns: Fixed in their lane, bars grow/shrink & colors/titles swap to leader */}
        {stableTeams.map((team, idx) => {
          if (!team) return null

          const reaction = reactions[team.id]
          const isHappy = reaction?.type === 'HAPPY'
          const isCrying = reaction?.type === 'CRYING'

          const rank = team.rank ?? idx + 1
          const isLeader = !allZero && team.score === maxScore && maxScore > 0

          // Color & title badge dynamically swap to the leading team in place!
          const color = allZero
            ? (idx === 0 ? '#38bdf8' : idx === 1 ? '#FFC857' : '#fb923c')
            : isLeader
            ? '#FFC857'
            : rank === 2
            ? '#38bdf8'
            : '#fb923c'

          const medal = allZero
            ? '🏁'
            : isLeader
            ? '👑'
            : rank === 2
            ? '🥈'
            : '🥉'

          const titleBadge = allZero
            ? `TEAM #${team.initialOrder || idx + 1}`
            : isLeader
            ? (isTied ? '👑 #1 TIED LEADER' : '👑 #1 LEADER')
            : rank === 2
            ? (isTied ? '🥈 #2 TIED' : '🥈 #2 PLACE')
            : '🥉 #3 PLACE'

          // Calculate strictly proportional bar pixel height (between 80px and 280px)
          const minBarHeight = 80
          const maxBarHeight = 280
          let barHeightPx = 130 // default baseline when all zero

          if (!allZero) {
            const normalized = (team.score - effectiveFloor) / range
            barHeightPx = Math.round(minBarHeight + Math.max(0, Math.min(1, normalized)) * (maxBarHeight - minBarHeight))
          }

          const emoji = isHappy
            ? '🥳'
            : isCrying
            ? '😭'
            : isLeader
            ? '🤩'
            : rank === 2
            ? '😊'
            : '😄'

          return (
            <div
              key={team.id}
              style={{
                flex: 1,
                maxWidth: 300,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                position: 'relative',
                zIndex: 5,
              }}
            >
              {/* Floating Reaction Pill */}
              {reaction && (
                <div
                  key={reaction.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    background: isHappy ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 13,
                    padding: '4px 14px',
                    borderRadius: 999,
                    boxShadow: isHappy ? '0 0 16px rgba(34,197,94,0.8)' : '0 0 16px rgba(239,68,68,0.8)',
                    animation: 'pop .4s both',
                    zIndex: 30,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isHappy ? `+${reaction.delta} pts! 🥳` : `${reaction.delta} pts! 😭`}
                </div>
              )}

              {/* Header on top of the graph pillar */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: 8,
                  width: '100%',
                  flexShrink: 0,
                }}
              >
                {/* Rank & Medal Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: isLeader ? 'rgba(255,200,87,0.25)' : 'rgba(255,255,255,0.08)',
                    border: `1.5px solid ${color}`,
                    color,
                    fontWeight: 900,
                    fontSize: 11,
                    letterSpacing: '.06em',
                    marginBottom: 6,
                    transition: 'all 0.4s ease',
                  }}
                >
                  <span>{medal}</span>
                  <span>{titleBadge}</span>
                </div>

                {/* Mascot Avatar */}
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: '50%',
                    background: isHappy ? '#15803d' : isCrying ? '#991b1b' : 'rgba(255,255,255,0.08)',
                    border: `3px solid ${isHappy ? '#4ade80' : isCrying ? '#f87171' : color}`,
                    boxShadow: `0 0 22px ${color}66`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 30,
                    marginBottom: 6,
                    animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
                    transition: 'all .3s ease',
                  }}
                >
                  {emoji}
                </div>

                {/* Team Name */}
                <div
                  style={{
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 800,
                    fontSize: 21,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    textShadow: `0 0 16px ${color}55`,
                  }}
                >
                  {team.teamName}
                </div>

                {/* Score Number with Glow */}
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 900,
                    fontSize: 30,
                    color: team.score > 0 ? '#4ade80' : team.score < 0 ? '#f87171' : '#cbd5e1',
                    lineHeight: 1.1,
                    marginTop: 2,
                  }}
                >
                  {team.score > 0 ? `+${team.score}` : team.score}
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: '#ffd9b8' }}>
                    pts
                  </span>
                </div>
              </div>

              {/* Dynamic Rising/Falling Bar Pillar */}
              <div
                style={{
                  width: '84%',
                  height: barHeightPx,
                  flexShrink: 0,
                  borderRadius: '16px 16px 0 0',
                  background: isLeader
                    ? 'linear-gradient(180deg, rgba(255,200,87,0.5) 0%, rgba(255,107,53,0.3) 40%, rgba(20,5,35,0.9) 100%)'
                    : `linear-gradient(180deg, ${color}55 0%, rgba(20,5,35,0.9) 100%)`,
                  border: `2px solid ${color}`,
                  borderBottom: 'none',
                  boxShadow: `0 0 30px ${color}33, inset 0 2px 14px ${color}44`,
                  transition: 'height 0.8s cubic-bezier(0.34, 1.35, 0.64, 1), border-color 0.4s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 8px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Glowing top line edge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: color,
                    boxShadow: `0 0 12px ${color}`,
                  }}
                />

                {/* Bar Graph Indicator / Margin Badge */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${color}88`,
                    color: '#fff',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.4s ease',
                  }}
                >
                  {allZero
                    ? 'START'
                    : isLeader
                    ? (isTied ? '🤝 TIED' : `👑 +${team.score - (teams.filter(t => t.id !== team.id).sort((a,b) => b.score - a.score)[0]?.score ?? 0)} LEAD`)
                    : `-${maxScore - team.score} PTS`}
                </div>

                {/* Measurement Tick Marks inside bar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    width: '60%',
                    opacity: 0.35,
                  }}
                >
                  <div style={{ height: 2, background: color, borderRadius: 2 }} />
                  <div style={{ height: 2, background: color, borderRadius: 2 }} />
                  <div style={{ height: 2, background: color, borderRadius: 2 }} />
                </div>

                {/* Pedestal Bottom Base */}
                <div
                  style={{
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 900,
                    fontSize: 18,
                    color,
                    letterSpacing: '.05em',
                    transition: 'color 0.4s ease',
                  }}
                >
                  {medal} #{rank}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Epic 1v1 Grand Finale Duel Arena Component (For 2 Teams Remaining) ────
function TVDuelBattleView({
  teams,
  allZero,
  reactions,
}: {
  teams: TeamScore[]
  allZero: boolean
  reactions: Record<number, { type: 'HAPPY' | 'CRYING'; delta: number; key: number }>
}) {
  // Stable fixed column positions so Left stays Left, Right stays Right, and leader styling swaps dynamically!
  const sortedStable = [...teams].sort((a, b) => (a.initialOrder ?? a.id) - (b.initialOrder ?? b.id))
  const team1 = sortedStable[0]
  const team2 = sortedStable[1]
  if (!team1 || !team2) return null

  const isTied = team1.score === team2.score
  const diff = Math.abs(team1.score - team2.score)

  const isTeam1Leading = team1.score > team2.score
  const isTeam2Leading = team2.score > team1.score

  const rx1 = reactions[team1.id]
  const rx2 = reactions[team2.id]

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '6px 0',
        maxWidth: 1180,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* Duel Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 22px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.25), rgba(255, 200, 87, 0.2))',
          border: '1.5px solid rgba(255, 200, 87, 0.5)',
          boxShadow: '0 0 24px rgba(255, 200, 87, 0.3)',
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>⚔️</span>
        <span
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: '#FFC857',
          }}
        >
          Grand Finale · 1v1 Championship Showdown
        </span>
        <span style={{ fontSize: 18 }}>⚔️</span>
      </div>

      {/* Battle Cards Arena */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: 20,
          width: '100%',
          flex: 1,
          maxHeight: 460,
          minHeight: 320,
        }}
      >
        {/* Left Duelist (Team 1) */}
        <TVDuelistCard
          team={team1}
          rank={team1.rank ?? 1}
          isLeader={isTeam1Leading && !allZero}
          isTied={isTied && !allZero}
          leadMargin={isTeam1Leading ? diff : undefined}
          behindMargin={isTeam2Leading ? diff : undefined}
          allZero={allZero}
          reaction={rx1}
          themeColor={allZero ? '#FFC857' : isTied || isTeam1Leading ? '#FFC857' : '#38bdf8'}
        />

        {/* Center VS Emblem with Points Difference */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexShrink: 0,
            zIndex: 10,
            padding: '0 4px',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B35 0%, #dc2626 100%)',
              border: '3.5px solid #FFC857',
              boxShadow: '0 0 35px rgba(255, 107, 53, 0.7), 0 0 70px rgba(220, 38, 38, 0.4)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 900,
              fontSize: 24,
              color: '#fff',
              letterSpacing: '.06em',
            }}
          >
            VS
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: isTied ? '#FFC857' : '#ffd9b8',
              whiteSpace: 'nowrap',
              letterSpacing: '.04em',
            }}
          >
            {allZero ? '0 - 0' : isTied ? '🤝 TIED!' : `±${diff} PTS DIFF`}
          </div>
        </div>

        {/* Right Duelist (Team 2) */}
        <TVDuelistCard
          team={team2}
          rank={team2.rank ?? 2}
          isLeader={isTeam2Leading && !allZero}
          isTied={isTied && !allZero}
          leadMargin={isTeam2Leading ? diff : undefined}
          behindMargin={isTeam1Leading ? diff : undefined}
          allZero={allZero}
          reaction={rx2}
          themeColor={isTeam2Leading ? '#FFC857' : isTied ? '#FFC857' : '#38bdf8'}
        />
      </div>
    </div>
  )
}

function TVDuelistCard({
  team,
  rank,
  isLeader,
  isTied,
  leadMargin,
  behindMargin,
  allZero,
  reaction,
  themeColor,
}: {
  team: TeamScore
  rank: number
  isLeader: boolean
  isTied: boolean
  leadMargin?: number
  behindMargin?: number
  allZero: boolean
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
  themeColor: string
}) {
  const isHappy = reaction?.type === 'HAPPY'
  const isCrying = reaction?.type === 'CRYING'

  const emoji = isHappy
    ? '🥳'
    : isCrying
    ? '😭'
    : isLeader
    ? '🤩'
    : isTied
    ? '😄'
    : '🙂'

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        borderRadius: 22,
        background: isLeader
          ? 'linear-gradient(180deg, rgba(255, 200, 87, 0.16) 0%, rgba(26, 5, 51, 0.85) 100%)'
          : 'linear-gradient(180deg, rgba(56, 189, 248, 0.14) 0%, rgba(13, 2, 24, 0.85) 100%)',
        border: `2.5px solid ${themeColor}`,
        boxShadow: `0 0 35px ${themeColor}44, 0 10px 40px rgba(0,0,0,0.5)`,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Reaction Float Pill */}
      {reaction && (
        <div
          key={reaction.key}
          style={{
            position: 'absolute',
            top: 14,
            background: isHappy ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 14,
            padding: '5px 16px',
            borderRadius: 999,
            boxShadow: isHappy ? '0 0 20px rgba(34,197,94,0.8)' : '0 0 20px rgba(239,68,68,0.8)',
            animation: 'pop .4s both',
            zIndex: 30,
            whiteSpace: 'nowrap',
          }}
        >
          {isHappy ? `+${reaction.delta} pts! 🥳` : `${reaction.delta} pts! 😭`}
        </div>
      )}

      {/* Top Header Row: Crown / Rank Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            padding: '3px 12px',
            borderRadius: 999,
            background: isLeader ? 'rgba(255, 200, 87, 0.25)' : 'rgba(56, 189, 248, 0.2)',
            color: themeColor,
            border: `1.5px solid ${themeColor}`,
            letterSpacing: '.06em',
            transition: 'all 0.4s ease',
          }}
        >
          {allZero ? `TEAM #${rank}` : isLeader ? '👑 #1 CURRENT LEADER' : isTied ? '🤝 #1 TIED FOR FIRST' : '⚡ #2 CONTENDER'}
        </span>
      </div>

      {/* Large Mascot Avatar */}
      <div
        style={{
          width: 86,
          height: 86,
          borderRadius: '50%',
          background: isHappy ? '#15803d' : isCrying ? '#991b1b' : 'rgba(255,255,255,0.08)',
          border: `3.5px solid ${isHappy ? '#4ade80' : isCrying ? '#f87171' : themeColor}`,
          boxShadow: `0 0 28px ${themeColor}66`,
          display: 'grid',
          placeItems: 'center',
          fontSize: 44,
          margin: '10px 0',
          position: 'relative',
          animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
          transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {emoji}
      </div>

      {/* Team Name & Details */}
      <div style={{ minWidth: 0, width: '100%' }}>
        <h2
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 800,
            fontSize: 32,
            lineHeight: 1.15,
            margin: '0 0 6px 0',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: `0 0 20px ${themeColor}66`,
          }}
        >
          {team.teamName}
        </h2>
        {team.leaderName && (
          <div style={{ color: '#ffd9b8', fontSize: 13, fontWeight: 500 }}>
            Leader: {team.leaderName}
          </div>
        )}
      </div>

      {/* Massive Score Number Display */}
      <div style={{ margin: '8px 0' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 900,
            fontSize: 58,
            lineHeight: 1,
            color: team.score > 0 ? '#4ade80' : team.score < 0 ? '#f87171' : '#fff',
            letterSpacing: '-.02em',
            textShadow: `0 0 25px ${team.score > 0 ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.3)'}`,
          }}
        >
          {team.score > 0 ? `+${team.score}` : team.score}
          <span style={{ fontSize: 18, fontWeight: 800, marginLeft: 6, color: '#ffd9b8', textTransform: 'uppercase' }}>
            PTS
          </span>
        </div>
      </div>

      {/* Lead / Chase Status Pill */}
      <div style={{ flexShrink: 0 }}>
        {allZero ? (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd9b8', background: 'rgba(255,255,255,0.06)', padding: '5px 14px', borderRadius: 999 }}>
            Waiting for first score...
          </div>
        ) : isTied ? (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#FFC857', background: 'rgba(255,200,87,0.15)', border: '1px solid rgba(255,200,87,0.4)', padding: '5px 14px', borderRadius: 999 }}>
            🔥 TIED AT {team.score} PTS
          </div>
        ) : isLeader ? (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#86efac', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.4)', padding: '5px 14px', borderRadius: 999 }}>
            🔥 LEADING BY +{leadMargin} PTS
          </div>
        ) : (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#7dd3fc', background: 'rgba(56,189,248,0.18)', border: '1px solid rgba(56,189,248,0.4)', padding: '5px 14px', borderRadius: 999 }}>
            🎯 {behindMargin} PTS TO TIE
          </div>
        )}
      </div>
    </div>
  )
}

// ── Champion Victory Screen (For 1 Remaining Winner) ──────────────────────
function TVChampionView({
  team,
  reaction,
}: {
  team: TeamScore
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
}) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: 64, animation: 'bannerPulse 2s infinite ease-in-out' }}>🏆</div>
      <div
        style={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 50%, #FFA23A 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          margin: '8px 0',
        }}
      >
        Tournament Champion
      </div>
      <div
        style={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 800,
          fontSize: 42,
          color: '#fff',
          marginTop: 6,
        }}
      >
        {team.teamName}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 900,
          fontSize: 48,
          color: '#4ade80',
          marginTop: 12,
        }}
      >
        +{team.score} PTS
      </div>
    </div>
  )
}
