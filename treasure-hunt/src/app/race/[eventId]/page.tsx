'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface RaceTeam {
  id: number
  teamName: string
  leaderName: string | null
  members: string | null
  initialOrder: number
  status: string
  currentMilestone: number
  completedStages: number
  totalStages: number
  progressPercent: number
  awaitingVerification: boolean
  isCompleted: boolean
  lastScanTime: string | null
}

interface EventData {
  id: number
  name: string
  status: string
  gameType: string
  stagesPerTeam: number
  hasCommonFinalQr: boolean
}

const TEAM_PALETTES = [
  { main: '#FF6B35', glow: '#FF8A57', avatar: '🏎️', badge: '#ffefe8' },
  { main: '#3b82f6', glow: '#60a5fa', avatar: '🚀', badge: '#eff6ff' },
  { main: '#8b5cf6', glow: '#a78bfa', avatar: '⚡', badge: '#f5f3ff' },
  { main: '#10b981', glow: '#34d399', avatar: '🏍️', badge: '#ecfdf5' },
  { main: '#ec4899', glow: '#f472b6', avatar: '🛸', badge: '#fdf2f8' },
  { main: '#f59e0b', glow: '#fbbf24', avatar: '🐆', badge: '#fffbeb' },
  { main: '#06b6d4', glow: '#22d3ee', avatar: '🦅', badge: '#ecfeff' },
  { main: '#e11d48', glow: '#fb7185', avatar: '🔥', badge: '#fff1f2' },
]

export default function TreasureHuntRacePage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [event, setEvent] = useState<EventData | null>(null)
  const [teams, setTeams] = useState<RaceTeam[]>([])
  const [totalStages, setTotalStages] = useState(5)
  const [hasFinal, setHasFinal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const prevMilestonesRef = useRef<Record<number, number>>({})
  const [celebrationTeam, setCelebrationTeam] = useState<string | null>(null)

  const fetchRaceData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/race`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
        setTotalStages(data.totalStages || 5)
        setHasFinal(Boolean(data.hasFinal))

        const incomingTeams: RaceTeam[] = data.teams || []

        // Detect newly finished teams for celebratory visual burst
        incomingTeams.forEach(t => {
          const prev = prevMilestonesRef.current[t.id]
          if (prev !== undefined && prev < t.currentMilestone && t.isCompleted) {
            setCelebrationTeam(t.teamName)
            setTimeout(() => setCelebrationTeam(null), 6000)
          }
          prevMilestonesRef.current[t.id] = t.currentMilestone
        })

        setTeams(incomingTeams)
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchRaceData()
    const interval = setInterval(fetchRaceData, 2000)
    return () => clearInterval(interval)
  }, [fetchRaceData])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Calculate milestones array: e.g. [Stage 1, Stage 2, Stage 3, Stage 4, Stage 5, Final Treasure]
  const milestones: Array<{ stage: number; label: string; icon: string }> = []
  for (let i = 1; i <= totalStages; i++) {
    milestones.push({ stage: i, label: `Hurdle ${i}`, icon: '🚧' })
  }
  if (hasFinal) {
    milestones.push({ stage: totalStages + 1, label: 'Final Treasure', icon: '🏆' })
  }

  const finishedTeams = teams.filter(t => t.isCompleted)
  const racingTeams = [...teams].sort((a, b) => b.progressPercent - a.progressPercent)

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 10%, #1c0936 0%, #0d031c 55%, #05010a 100%)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ── Background Cyber Ambient Grids & Lights ────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255, 107, 53, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 107, 53, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: -100, left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 107, 53, 0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, right: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 200, 87, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Celebration Toast for Final Treasure Winner ────────────── */}
      {celebrationTeam && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'linear-gradient(135deg, #FF6B35, #f59e0b)',
            padding: '12px 28px',
            borderRadius: 999,
            color: '#fff',
            fontWeight: 900,
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 0 40px rgba(255, 200, 87, 0.8), 0 8px 30px rgba(0,0,0,0.5)',
            border: '2px solid #fff',
            animation: 'pop 0.4s both',
          }}
        >
          <span style={{ fontSize: 28 }}>🏆</span>
          <span>TREASURE FOUND! {celebrationTeam} CROSSED THE FINISH LINE!</span>
          <span style={{ fontSize: 28 }}>🎉</span>
        </div>
      )}

      {/* ── Top TV Header Bar ──────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(13, 3, 28, 0.75)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FF6B35 0%, #dc2626 100%)',
              border: '2px solid #FFC857',
              boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
            }}
          >
            🏁
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 900,
                  fontSize: 24,
                  margin: 0,
                  background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 50%, #FFA23A 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  letterSpacing: '-.02em',
                }}
              >
                {event?.name || 'Treasure Hunt Grand Prix'}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(255,107,53,0.3), rgba(255,200,87,0.2))',
                  color: '#FFC857',
                  border: '1.5px solid rgba(255,200,87,0.5)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                🏎️ LIVE 3D HURDLE TRACK
              </span>
            </div>
            <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 2 }}>
              GlowFiesta 2026 Championship · Real-Time Stage Progression &amp; Speed Race
            </div>
          </div>
        </div>

        {/* Right Stats & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Winner Pill */}
          {finishedTeams.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 999,
                background: 'rgba(255, 200, 87, 0.18)',
                border: '1.5px solid #FFC857',
                color: '#FFC857',
                fontWeight: 800,
                fontSize: 12,
                boxShadow: '0 0 16px rgba(255, 200, 87, 0.3)',
              }}
            >
              <span>🏆</span>
              <span>
                {finishedTeams[0].teamName} ({finishedTeams.length} Finished)
              </span>
            </div>
          )}

          {/* Active Teams Badge */}
          <div
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            👥 {teams.length} Racers
          </div>

          {/* Live TV Pulsing Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ade80',
              fontWeight: 900,
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
                animation: 'pulse-ring 1.5s infinite',
              }}
            />
            LIVE ARENA
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 10,
              padding: '6px 14px',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>{isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* ── Main 3D Race Arena Container ───────────────────────────── */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 28px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 18, color: '#ffd9b8' }}>
            Preparing 3D Hurdle Track…
          </div>
        ) : teams.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🏎️</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFC857' }}>No teams registered for this hunt yet</div>
            <div style={{ color: '#ffd9b8', marginTop: 6, fontSize: 14 }}>Register teams to start the live race track.</div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* ── Track Header: Hurdle Columns with Distance Gates ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 220, // offset for team name cards on left
                paddingRight: 60,  // offset for finish line podium
                marginBottom: 4,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', position: 'relative' }}>
                {/* Start Gate */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateX(-50%)' }}>
                  <span style={{ fontSize: 18 }}>🏁</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    START
                  </span>
                </div>

                {/* Hurdle Stage Markers */}
                {milestones.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transform: 'translateX(50%)',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: m.stage === milestones.length ? '#FFC857' : '#ffd9b8',
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        textShadow: m.stage === milestones.length ? '0 0 12px rgba(255,200,87,0.6)' : 'none',
                      }}
                    >
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3D Perspective Race Track Surface ─────────────────── */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                gap: 8,
                perspective: '1000px',
                transformStyle: 'preserve-3d',
                padding: '10px 14px',
                background: 'linear-gradient(180deg, rgba(20, 5, 35, 0.7) 0%, rgba(35, 10, 60, 0.8) 100%)',
                borderRadius: 20,
                border: '1.5px solid rgba(255, 107, 53, 0.3)',
                boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.6), 0 10px 40px rgba(0, 0, 0, 0.5)',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {racingTeams.map((team, idx) => {
                const palette = TEAM_PALETTES[team.initialOrder % TEAM_PALETTES.length]
                const isLeader = idx === 0 && team.progressPercent > 0
                const rankNum = idx + 1

                return (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      height: '100%',
                      maxHeight: 64,
                      minHeight: 46,
                      position: 'relative',
                    }}
                  >
                    {/* Left Team Info Plate */}
                    <div
                      style={{
                        width: 200,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 12px',
                        borderRadius: 12,
                        background: isLeader
                          ? 'linear-gradient(135deg, rgba(255,200,87,0.25), rgba(255,107,53,0.2))'
                          : 'rgba(255, 255, 255, 0.06)',
                        border: isLeader ? '1.5px solid #FFC857' : '1px solid rgba(255,255,255,0.12)',
                        boxShadow: isLeader ? '0 0 16px rgba(255,200,87,0.3)' : 'none',
                        transition: 'all 0.4s ease',
                      }}
                    >
                      {/* Rank Number */}
                      <span
                        style={{
                          fontFamily: "'Fredoka', sans-serif",
                          fontWeight: 900,
                          fontSize: 16,
                          color: isLeader ? '#FFC857' : '#94a3b8',
                          width: 22,
                        }}
                      >
                        #{rankNum}
                      </span>

                      {/* Team Avatar Icon */}
                      <span style={{ fontSize: 22 }}>{palette.avatar}</span>

                      {/* Name & Subtitle */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {team.teamName}
                        </div>
                        <div style={{ fontSize: 11, color: palette.glow, fontWeight: 600 }}>
                          {team.isCompleted
                            ? '🏆 Winner!'
                            : team.awaitingVerification
                            ? '⏳ At Reception'
                            : `Stage ${team.currentMilestone} of ${totalStages}`}
                        </div>
                      </div>
                    </div>

                    {/* ── 3D Lane Track with Hurdles ────────────────────── */}
                    <div
                      style={{
                        flex: 1,
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 100%)',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                        marginRight: 20,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Road Center Dotted Striping */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '50%',
                          height: 2,
                          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.2) 50%, transparent 50%)',
                          backgroundSize: '24px 2px',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Hurdle Gate Visuals along the Track */}
                      {milestones.map((m, mIdx) => {
                        const stepPct = (m.stage / milestones.length) * 100
                        const isCleared = team.currentMilestone >= m.stage

                        return (
                          <div
                            key={mIdx}
                            style={{
                              position: 'absolute',
                              left: `${stepPct}%`,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              background: isCleared ? '#22c55e' : 'rgba(255, 107, 53, 0.4)',
                              boxShadow: isCleared ? '0 0 10px #22c55e' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 5,
                              transition: 'background 0.4s ease',
                            }}
                          >
                            {/* Hurdle icon bar */}
                            <div
                              style={{
                                width: 14,
                                height: 24,
                                borderRadius: 4,
                                background: isCleared ? '#15803d' : '#991b1b',
                                border: `1.5px solid ${isCleared ? '#86efac' : '#f87171'}`,
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 9,
                                color: '#fff',
                                fontWeight: 900,
                              }}
                            >
                              {isCleared ? '✓' : '!'}
                            </div>
                          </div>
                        )
                      })}

                      {/* Progress Filled Glow Ribbon */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${team.progressPercent}%`,
                          background: `linear-gradient(90deg, ${palette.main}33 0%, ${palette.main}99 100%)`,
                          borderRight: `3px solid ${palette.glow}`,
                          boxShadow: `0 0 20px ${palette.main}`,
                          transition: 'width 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
                          zIndex: 2,
                        }}
                      />

                      {/* ── 3D Moving Racer / Vehicle on Lane ────────────── */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(${team.progressPercent}% - 22px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                          transition: 'left 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {/* 3D Vehicle Pod */}
                        <div
                          style={{
                            width: 44,
                            height: 34,
                            borderRadius: 10,
                            background: `linear-gradient(135deg, ${palette.main}, ${palette.glow})`,
                            border: '2px solid #fff',
                            boxShadow: `0 0 20px ${palette.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 18,
                            animation: team.isCompleted
                              ? 'bounce 0.6s infinite alternate'
                              : team.awaitingVerification
                              ? 'pulse-ring 1s infinite'
                              : 'none',
                          }}
                        >
                          {palette.avatar}
                        </div>

                        {/* Status Float Indicator */}
                        {team.awaitingVerification ? (
                          <span
                            style={{
                              background: '#f59e0b',
                              color: '#000',
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: 6,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
                            }}
                          >
                            ⏳ AT DESK
                          </span>
                        ) : team.isCompleted ? (
                          <span
                            style={{
                              background: '#22c55e',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: 6,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 0 12px rgba(34, 197, 94, 0.8)',
                            }}
                          >
                            👑 FINISHED!
                          </span>
                        ) : null}
                      </div>

                      {/* Finish Line Checkered Banner */}
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 16,
                          backgroundImage: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)',
                          backgroundPosition: '0 0, 8px 8px',
                          backgroundSize: '16px 16px',
                          borderLeft: '2px solid #FFC857',
                          boxShadow: '0 0 15px rgba(255, 200, 87, 0.5)',
                          zIndex: 6,
                        }}
                      />
                    </div>

                    {/* Right Progress Percentage Display */}
                    <div
                      style={{
                        width: 50,
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 900,
                        fontSize: 16,
                        color: team.isCompleted ? '#4ade80' : '#ffd9b8',
                        flexShrink: 0,
                      }}
                    >
                      {team.progressPercent}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
