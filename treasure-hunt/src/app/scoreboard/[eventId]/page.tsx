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
  '#f59e0b', '#06b6d4', '#e11d48', '#84cc16', '#a855f7'
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

  const top3 = teams.slice(0, 3)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #20083b 0%, #0d0218 60%, #05010a 100%)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '24px 28px 60px',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Background festive glow circles */}
      <div style={{ position: 'absolute', top: -100, left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 150, right: '15%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 32,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 22,
              boxShadow: '0 0 24px rgba(255,107,53,0.6)',
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
                  fontSize: 32,
                  letterSpacing: '-.01em',
                  margin: 0,
                  background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 50%, #FFA23A 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 2px 14px rgba(255,200,87,0.3))',
                }}
              >
                {event?.name || 'Live Scoreboard'}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,107,53,0.2)',
                  color: '#FFC857',
                  border: '1px solid rgba(255,200,87,0.4)',
                }}
              >
                {event?.gameType === 'FUNTAKSHARI' ? 'FUNTAKSHARI' : 'QUIZ BATTLE'}
              </span>
            </div>
            <div style={{ color: '#ffd9b8', fontSize: 14, marginTop: 4 }}>
              ✨ GlowFiesta 2026 Live Championship Leaderboard
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live Pulsing Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#4ade80',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '.06em',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
                animation: 'pulse-ring 1.6s infinite',
              }}
            />
            LIVE SCOREBOARD
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: '9px 16px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background .15s ease',
            }}
          >
            <span>{isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: 20, color: '#ffd9b8' }}>
          Connecting to live scoreboard…
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '120px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFC857' }}>Waiting for teams to join…</div>
          <div style={{ color: '#ffd9b8', marginTop: 8, fontSize: 15 }}>Scores will appear here in real-time as the organizer awards points.</div>
        </div>
      ) : (
        <>
          {/* Starting Banner when everyone is at zero */}
          {allZero && (
            <div
              style={{
                maxWidth: 820,
                margin: '0 auto 36px',
                textAlign: 'center',
                padding: '16px 24px',
                borderRadius: 16,
                background: 'rgba(255,200,87,0.12)',
                border: '1.5px solid rgba(255,200,87,0.4)',
                color: '#fff0b3',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              🏁 <strong>All teams are at the starting line (0 pts).</strong> Leaderboard ranks will begin once the first points are awarded!
            </div>
          )}

          {/* ── Top 3 Podium (Only shown when scores exist and teams >= 3) ── */}
          {!allZero && teams.length >= 3 && (
            <section style={{ marginBottom: 44, position: 'relative', zIndex: 5 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: 20,
                  maxWidth: 960,
                  margin: '0 auto',
                  padding: '20px 0 10px',
                }}
              >
                {/* Rank 2 (Silver) or Tied 1st */}
                <PodiumCard
                  team={top3[1]}
                  place={top3[1]?.rank ?? 2}
                  reaction={reactions[top3[1]?.id]}
                  color={top3[1]?.rank === 1 ? '#FFC857' : '#38bdf8'}
                  isLeader={top3[1]?.rank === 1}
                />

                {/* Rank 1 (Gold) */}
                <PodiumCard
                  team={top3[0]}
                  place={top3[0]?.rank ?? 1}
                  reaction={reactions[top3[0]?.id]}
                  color="#FFC857"
                  isLeader
                />

                {/* Rank 3 (Bronze) */}
                <PodiumCard
                  team={top3[2]}
                  place={top3[2]?.rank ?? 3}
                  reaction={reactions[top3[2]?.id]}
                  color={top3[2]?.rank === 1 ? '#FFC857' : top3[2]?.rank === 2 ? '#38bdf8' : '#fb923c'}
                  isLeader={top3[2]?.rank === 1}
                />
              </div>
            </section>
          )}

          {/* ── Full Leaderboard Grid ──────────────────────────────── */}
          <section style={{ maxWidth: 1040, margin: '0 auto', position: 'relative', zIndex: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.12em', color: '#ffd9b8', textTransform: 'uppercase' }}>
                All Teams · {allZero ? 'Team Lineup' : 'Live Standings'}
              </div>
              <div style={{ fontSize: 13, color: '#a78bfa' }}>
                Auto-updating every second ⚡
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {teams.map((team, idx) => {
                const reaction = reactions[team.id]
                const color = COLORS[idx % COLORS.length]

                return (
                  <LeaderboardRow
                    key={team.id}
                    team={team}
                    allZero={allZero}
                    color={color}
                    reaction={reaction}
                  />
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ── Podium Component for Top 3 ─────────────────────────────────────────────
function PodiumCard({
  team,
  place,
  reaction,
  color,
  isLeader = false,
}: {
  team: TeamScore
  place: number
  reaction?: { type: 'HAPPY' | 'CRYING'; delta: number; key: number }
  color: string
  isLeader?: boolean
}) {
  if (!team) return null

  const height = place === 1 ? 260 : place === 2 ? 220 : 190
  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
  const isHappy = reaction?.type === 'HAPPY'
  const isCrying = reaction?.type === 'CRYING'

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        transition: 'transform .3s ease',
        transform: isHappy ? 'translateY(-10px) scale(1.03)' : isCrying ? 'translateY(4px)' : 'none',
      }}
    >
      {/* Reaction Speech Bubble */}
      {reaction && (
        <div
          key={reaction.key}
          style={{
            position: 'absolute',
            top: -50,
            background: isHappy ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 16,
            padding: '8px 16px',
            borderRadius: 999,
            boxShadow: isHappy ? '0 0 20px rgba(34,197,94,0.7)' : '0 0 20px rgba(239,68,68,0.7)',
            animation: 'pop .4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          {isHappy ? `+${reaction.delta} pts! 🥳 HAPPY!` : `${reaction.delta} pts! 😭 CRYING!`}
        </div>
      )}

      {/* Dynamic Animated Avatar */}
      <div
        style={{
          width: isLeader ? 92 : 76,
          height: isLeader ? 92 : 76,
          borderRadius: '50%',
          background: isHappy ? '#16a34a' : isCrying ? '#991b1b' : 'rgba(255,255,255,0.1)',
          border: `3.5px solid ${isHappy ? '#4ade80' : isCrying ? '#f87171' : color}`,
          display: 'grid',
          placeItems: 'center',
          fontSize: isLeader ? 42 : 36,
          marginBottom: 10,
          boxShadow: isLeader ? `0 0 32px ${color}66` : '0 4px 20px rgba(0,0,0,0.4)',
          position: 'relative',
          animation: isHappy ? 'pulse-ring 1s infinite' : isCrying ? 'shake .3s infinite' : 'none',
        }}
      >
        <span>
          {isHappy ? '😄' : isCrying ? '😭' : medal}
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: -6,
            background: color,
            color: '#000',
            fontWeight: 900,
            fontSize: 12,
            padding: '1px 8px',
            borderRadius: 999,
          }}
        >
          #{place} {team.isTied && '(Tied)'}
        </span>
      </div>

      {/* Team Details */}
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: isLeader ? 20 : 17, color: '#fff', marginBottom: 2 }}>
        {team.teamName}
      </div>
      {team.leaderName && (
        <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 6 }}>
          {team.leaderName}
        </div>
      )}

      {/* Podium Pillar */}
      <div
        style={{
          width: '100%',
          height,
          background: isLeader
            ? 'linear-gradient(180deg, rgba(255,200,87,0.3) 0%, rgba(255,107,53,0.15) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
          border: `2px solid ${color}88`,
          borderRadius: '18px 18px 6px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: 16,
          boxShadow: `0 10px 30px rgba(0,0,0,0.4)`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.08em' }}>SCORE</div>
        <div
          style={{
            fontSize: isLeader ? 54 : 44,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
            color: isLeader ? '#FFC857' : '#fff',
            textShadow: `0 0 20px ${color}`,
          }}
        >
          {team.score > 0 ? `+${team.score}` : team.score}
        </div>
        <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>points</div>
      </div>
    </div>
  )
}

// ── Leaderboard Row Component ──────────────────────────────────────────────
function LeaderboardRow({
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

  // Treat tied leaders equally; when allZero is true, no team is crowned leader
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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px 70px minmax(0, 1fr) 200px',
        alignItems: 'center',
        gap: 16,
        padding: '16px 24px',
        borderRadius: 20,
        background: isHappy
          ? 'linear-gradient(90deg, rgba(22,163,74,0.3) 0%, rgba(22,163,74,0.15) 100%)'
          : isCrying
          ? 'linear-gradient(90deg, rgba(185,28,28,0.3) 0%, rgba(185,28,28,0.15) 100%)'
          : isLeader
          ? 'linear-gradient(90deg, rgba(255,200,87,0.18) 0%, rgba(255,107,53,0.12) 100%)'
          : 'rgba(255,255,255,0.05)',
        border: isHappy
          ? '2px solid #22c55e'
          : isCrying
          ? '2px solid #ef4444'
          : isLeader
          ? '2px solid #FFC857'
          : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isHappy
          ? '0 0 24px rgba(34,197,94,0.35)'
          : isCrying
          ? '0 0 24px rgba(239,68,68,0.35)'
          : isLeader
          ? '0 0 20px rgba(255,200,87,0.25)'
          : '0 4px 14px rgba(0,0,0,0.2)',
        position: 'relative',
        transition: 'all .3s ease',
        transform: isHappy ? 'scale(1.015)' : 'none',
      }}
    >
      {/* Rank or Team Number */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: !allZero && rank && rank <= 3 ? 24 : 17,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: allZero
              ? '#94a3b8'
              : rank === 1
              ? '#FFC857'
              : rank === 2
              ? '#38bdf8'
              : rank === 3
              ? '#fb923c'
              : '#94a3b8',
          }}
        >
          {allZero ? `T-${team.initialOrder || '•'}` : `#${rank}`}
        </div>
      </div>

      {/* Animated Emotion Avatar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: isHappy ? '#16a34a' : isCrying ? '#991b1b' : color,
            display: 'grid',
            placeItems: 'center',
            fontSize: 26,
            boxShadow: `0 0 16px ${color}66`,
            animation: isHappy ? 'pop .4s ease' : isCrying ? 'shake .3s infinite' : 'none',
          }}
        >
          {emotionEmoji}
        </div>
      </div>

      {/* Team Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff' }}>
            {team.teamName}
          </span>
          {isLeader && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.06em',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(255,107,53,0.5)',
              }}
            >
              👑 {isTied ? 'TIED LEADER' : 'TOP LEADER'}
            </span>
          )}
          {!allZero && isTied && !isLeader && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.1)',
                color: '#ffd9b8',
              }}
            >
              Tied #{rank}
            </span>
          )}
        </div>
        {(team.leaderName || team.members) && (
          <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.leaderName && <strong>Leader: {team.leaderName}</strong>}
            {team.leaderName && team.members && <span> · </span>}
            {team.members && <span>👥 {team.members}</span>}
          </div>
        )}
      </div>

      {/* Score & Animated Pill */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          {reaction && (
            <span
              key={reaction.key}
              style={{
                fontSize: 13,
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 999,
                background: isHappy ? '#22c55e' : '#ef4444',
                color: '#fff',
                animation: 'pop .35s both',
              }}
            >
              {isHappy ? `+${reaction.delta} 😄` : `${reaction.delta} 😢`}
            </span>
          )}

          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: team.score > 0 ? '#4ade80' : team.score < 0 ? '#f87171' : '#cbd5e1',
              letterSpacing: '-.02em',
              lineHeight: 1,
            }}
          >
            {team.score > 0 ? `+${team.score}` : team.score}
            <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 4, color: '#ffd9b8' }}>pts</span>
          </div>
        </div>
      </div>
    </div>
  )
}
