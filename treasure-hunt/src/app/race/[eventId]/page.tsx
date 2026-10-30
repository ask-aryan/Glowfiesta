'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

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

// Pirate Ship Fleet palettes with custom flags & ship designs
const PIRATE_FLEET = [
  { main: '#FF6B35', glow: '#FF8A57', boat: '⛵', flag: '🏴‍☠️', name: 'Black Pearl', crest: '💀' },
  { main: '#38bdf8', glow: '#7dd3fc', boat: '🛶', flag: '🦜', name: 'Sea Serpent', crest: '🌊' },
  { main: '#a855f7', glow: '#c084fc', boat: '⛵', flag: '🐙', name: 'Flying Dutchman', crest: '⚡' },
  { main: '#10b981', glow: '#34d399', boat: '⛵', flag: '🐊', name: 'Jolly Roger', crest: '🧭' },
  { main: '#ec4899', glow: '#f472b6', boat: '⛵', flag: '🧜‍♀️', name: 'Queen Anne', crest: '⭐' },
  { main: '#f59e0b', glow: '#fbbf24', boat: '🛶', flag: '⚔️', name: 'Golden Hind', crest: '🪙' },
  { main: '#06b6d4', glow: '#22d3ee', boat: '⛵', flag: '🦈', name: 'Poseidon', crest: '🔱' },
  { main: '#e11d48', glow: '#fb7185', boat: '⛵', flag: '🔥', name: 'Crimson Tide', crest: '💣' },
]

export default function PirateTreasureHuntPage({ params }: { params: { eventId: string } }) {
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

        incomingTeams.forEach(t => {
          const prev = prevMilestonesRef.current[t.id]
          if (prev !== undefined && prev < t.currentMilestone && t.isCompleted) {
            setCelebrationTeam(t.teamName)
            setTimeout(() => setCelebrationTeam(null), 7000)
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

  // Checkpoint Islands (Stages) + Final Treasure Island
  const islands: Array<{ stage: number; label: string; icon: string; name: string }> = []
  const islandNames = ['Skull Atoll', 'Siren Isle', 'Coral Reef', 'Cannon Rock', 'Smuggler Cove', 'Kraken Deep']
  
  for (let i = 1; i <= totalStages; i++) {
    islands.push({
      stage: i,
      label: `Stage ${i}`,
      icon: '🏝️',
      name: islandNames[(i - 1) % islandNames.length],
    })
  }
  if (hasFinal) {
    islands.push({
      stage: totalStages + 1,
      label: 'Treasure',
      icon: '👑',
      name: 'Treasure Island',
    })
  }

  const finishedTeams = teams.filter(t => t.isCompleted)
  const sailingTeams = [...teams].sort((a, b) => b.progressPercent - a.progressPercent)
  const leaderTeam = sailingTeams[0]

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 15%, #0c2035 0%, #061122 55%, #020710 100%)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <style jsx global>{`
        @keyframes float-boat {
          0% { transform: translateY(0px) rotate(-1.5deg); }
          50% { transform: translateY(-5px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(-1.5deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.85; }
        }
        @keyframes chest-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 200, 87, 0.7)); }
          50% { filter: drop-shadow(0 0 24px rgba(255, 200, 87, 1)); }
        }
        @keyframes water-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>

      {/* ── Ambient Nautical Grid Background ────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '36px 36px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: -140, left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: '10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 200, 87, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Celebration Toast Banner ───────────────────────────────── */}
      {celebrationTeam && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'linear-gradient(135deg, #FF6B35 0%, #b45309 60%, #FFC857 100%)',
            padding: '12px 32px',
            borderRadius: 999,
            color: '#fff',
            fontWeight: 900,
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 0 50px rgba(255, 200, 87, 0.9), 0 8px 32px rgba(0,0,0,0.6)',
            border: '2px solid #FFC857',
            animation: 'pulse-soft 1s infinite alternate',
          }}
        >
          <span style={{ fontSize: 30 }}>🏴‍☠️</span>
          <span>TREASURE CLAIMED! Captain {celebrationTeam} reached the Golden Chest!</span>
          <span style={{ fontSize: 30 }}>💰</span>
        </div>
      )}

      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 28px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
          background: 'rgba(6, 17, 34, 0.9)',
          backdropFilter: 'blur(14px)',
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
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '2px solid #38bdf8',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
            }}
          >
            🧭
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 900,
                  fontSize: 22,
                  margin: 0,
                  background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 50%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  letterSpacing: '-.01em',
                }}
              >
                {event?.name || 'Treasure Hunt'}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '3px 12px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(255,200,87,0.2), rgba(14,165,233,0.2))',
                  color: '#FFC857',
                  border: '1.5px solid rgba(255,200,87,0.5)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                ⚓ PIRATE TREASURE VOYAGE
              </span>
            </div>
            <div style={{ color: '#bae6fd', fontSize: 12, marginTop: 2 }}>
              High Seas Championship · Sailing to Treasure Island across {totalStages} Checkpoints
            </div>
          </div>
        </div>

        {/* Right Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {finishedTeams.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 999,
                background: 'rgba(255, 200, 87, 0.2)',
                border: '1.5px solid #FFC857',
                color: '#FFC857',
                fontWeight: 800,
                fontSize: 12,
                boxShadow: '0 0 18px rgba(255, 200, 87, 0.4)',
              }}
            >
              <span>👑</span>
              <span>1st: {finishedTeams[0].teamName}</span>
            </div>
          )}

          <div
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            🏴‍☠️ {teams.length} Ships Sailing
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(34, 197, 94, 0.16)',
              border: '1px solid rgba(34, 197, 94, 0.45)',
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
              }}
            />
            LIVE OCEAN
          </div>

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

      {/* ── Main Arena Surface ───────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 28px 20px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          gap: 12,
        }}
      >
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 18, color: '#bae6fd' }}>
            Unfurling Pirate Charts &amp; Islands…
          </div>
        ) : teams.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🏴‍☠️</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFC857' }}>No pirate crews registered yet</div>
            <div style={{ color: '#bae6fd', marginTop: 6, fontSize: 14 }}>Register teams to launch the ships onto the ocean voyage!</div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, rgba(8, 26, 48, 0.85) 0%, rgba(4, 14, 28, 0.95) 100%)',
              borderRadius: 22,
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              boxShadow: 'inset 0 0 60px rgba(2, 6, 23, 0.8), 0 12px 40px rgba(0, 0, 0, 0.6)',
              padding: '16px 20px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* ── Clean Unified Checkpoints Header on Top (Exact pixel grid alignment!) ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                paddingBottom: 14,
                marginBottom: 10,
                borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                flexShrink: 0,
              }}
            >
              {/* Left Column matching Team Plate width */}
              <div
                style={{
                  width: 208,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}
              >
                <span>🏴‍☠️ FLEET CREW</span>
              </div>

              {/* Middle Column matching Sea Lane width exactly */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  height: 44,
                  marginRight: 10,
                }}
              >
                {/* Port Marker (Start 0%) */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 18 }}>⚓</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: '#94a3b8',
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    PORT
                  </span>
                </div>

                {/* Island Milestones (Each stage exactly aligned!) */}
                {islands.map((isle, idx) => {
                  const stepPct = (isle.stage / islands.length) * 100
                  const isFinalChest = idx === islands.length - 1

                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${stepPct}%`,
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: isFinalChest ? 22 : 18,
                          animation: isFinalChest ? 'chest-glow 2s infinite' : 'none',
                        }}
                      >
                        {isFinalChest ? '👑' : isle.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: isFinalChest ? '#FFC857' : '#bae6fd',
                          letterSpacing: '.05em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                          textShadow: isFinalChest ? '0 0 12px rgba(255,200,87,0.8)' : 'none',
                        }}
                      >
                        {isle.name}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Right Column matching Percentage width */}
              <div
                style={{
                  width: 50,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '.06em',
                }}
              >
                PROGRESS
              </div>
            </div>

            {/* ── Scrollable Ocean Sea Lanes Container ─────────────── */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                gap: 14,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {sailingTeams.map((team, idx) => {
                const fleet = PIRATE_FLEET[team.initialOrder % PIRATE_FLEET.length]
                const isLeader = idx === 0 && team.progressPercent > 0
                const rankNum = idx + 1

                return (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      height: 72,
                      minHeight: 72,
                      position: 'relative',
                    }}
                  >
                    {/* Left Pirate Ship Identity Plate */}
                    <div
                      style={{
                        width: 208,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 14,
                        background: isLeader
                          ? 'linear-gradient(135deg, rgba(255,200,87,0.22), rgba(245,158,11,0.18))'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isLeader ? '1.5px solid #FFC857' : '1px solid rgba(56, 189, 248, 0.25)',
                        boxShadow: isLeader ? '0 0 16px rgba(255,200,87,0.35)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Rank Number */}
                      <span
                        style={{
                          fontFamily: "'Fredoka', sans-serif",
                          fontWeight: 900,
                          fontSize: 17,
                          color: isLeader ? '#FFC857' : '#94a3b8',
                          width: 24,
                        }}
                      >
                        #{rankNum}
                      </span>

                      {/* Ship Flag & Crest */}
                      <span style={{ fontSize: 24 }}>{fleet.flag}</span>

                      {/* Team & Vessel Name */}
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
                        <div style={{ fontSize: 11, color: fleet.glow, fontWeight: 700, marginTop: 1 }}>
                          {team.isCompleted
                            ? '💰 Treasure Claimed!'
                            : team.awaitingVerification
                            ? '⚓ Docked at Port'
                            : `Island ${team.currentMilestone} of ${totalStages}`}
                        </div>
                      </div>
                    </div>

                    {/* ── Ocean Water Sea Lane (No clipping!) ─────────── */}
                    <div
                      style={{
                        flex: 1,
                        height: 54,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.09) 0%, rgba(6, 182, 212, 0.15) 100%)',
                        borderRadius: 14,
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.6)',
                        marginRight: 10,
                        overflow: 'visible',
                      }}
                    >
                      {/* Water Wave Current Pattern */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 14,
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(56, 189, 248, 0.04) 15px, rgba(56, 189, 248, 0.04) 30px)',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Checkpoint Island Gates along the Channel */}
                      {islands.map((isle, mIdx) => {
                        const stepPct = (isle.stage / islands.length) * 100
                        const isReached = team.currentMilestone >= isle.stage
                        const isFinalIsland = mIdx === islands.length - 1

                        return (
                          <div
                            key={mIdx}
                            style={{
                              position: 'absolute',
                              left: `${stepPct}%`,
                              top: 0,
                              bottom: 0,
                              width: 2,
                              transform: 'translateX(-50%)',
                              background: isReached ? '#22c55e' : 'rgba(56, 189, 248, 0.35)',
                              boxShadow: isReached ? '0 0 10px #22c55e' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 5,
                              transition: 'background 0.4s ease',
                            }}
                          >
                            {/* Island Anchor Badge */}
                            <div
                              style={{
                                width: 22,
                                height: 26,
                                borderRadius: 6,
                                background: isReached
                                  ? (isFinalIsland ? '#eab308' : '#15803d')
                                  : 'rgba(15, 23, 42, 0.9)',
                                border: `1.5px solid ${isReached ? (isFinalIsland ? '#fef08a' : '#86efac') : '#38bdf8'}`,
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: isFinalIsland ? 12 : 10,
                                color: '#fff',
                                fontWeight: 900,
                                boxShadow: isReached ? '0 0 12px rgba(34,197,94,0.6)' : 'none',
                              }}
                            >
                              {isReached ? (isFinalIsland ? '💎' : '✓') : '⚓'}
                            </div>
                          </div>
                        )
                      })}

                      {/* Water Wake / Trail behind Boat */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          borderRadius: '14px 0 0 14px',
                          width: `${team.progressPercent}%`,
                          background: `linear-gradient(90deg, rgba(6, 182, 212, 0.2) 0%, ${fleet.main}66 100%)`,
                          borderRight: `3px solid ${fleet.glow}`,
                          boxShadow: `0 0 20px ${fleet.main}`,
                          transition: 'width 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
                          zIndex: 2,
                        }}
                      />

                      {/* ── Floating Pirate Ship on Ocean Channel ──────── */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `calc(${team.progressPercent}% - 26px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 15,
                          transition: 'left 1.2s cubic-bezier(0.34, 1.35, 0.64, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          overflow: 'visible',
                        }}
                      >
                        {/* Floating Boat Vessel */}
                        <div
                          style={{
                            width: 52,
                            height: 42,
                            borderRadius: 14,
                            background: `linear-gradient(135deg, ${fleet.main}, ${fleet.glow})`,
                            border: '2px solid #fff',
                            boxShadow: `0 0 24px ${fleet.glow}, 0 6px 16px rgba(0,0,0,0.6)`,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 24,
                            animation: 'float-boat 2.2s infinite ease-in-out',
                          }}
                        >
                          {fleet.boat}
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
                              boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)',
                            }}
                          >
                            ⚓ AT RECEPTION
                          </span>
                        ) : team.isCompleted ? (
                          <span
                            style={{
                              background: '#eab308',
                              color: '#422006',
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: 6,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 0 16px rgba(234, 179, 8, 0.9)',
                            }}
                          >
                            💰 TREASURE FOUND!
                          </span>
                        ) : null}
                      </div>

                      {/* Final Treasure Chest Island Goal */}
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 24,
                          borderRadius: '0 14px 14px 0',
                          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.3) 0%, rgba(202, 138, 4, 0.6) 100%)',
                          borderLeft: '2.5px solid #FFC857',
                          boxShadow: '0 0 25px rgba(255, 200, 87, 0.8)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 14,
                          zIndex: 6,
                        }}
                      >
                        🪙
                      </div>
                    </div>

                    {/* Right Voyage Progress Percentage */}
                    <div
                      style={{
                        width: 50,
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 900,
                        fontSize: 16,
                        color: team.isCompleted ? '#facc15' : '#bae6fd',
                        flexShrink: 0,
                      }}
                    >
                      {team.progressPercent}%
                    </div>
                  </div>
                )
              })}

              {/* Bottom Quick Ocean Stats if few teams (fills empty space elegantly) */}
              {sailingTeams.length <= 2 && leaderTeam && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px dashed rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>🧭</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8' }}>Current Fleet Leader</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{leaderTeam.teamName}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>🏝️</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8' }}>Current Location</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                        {leaderTeam.isCompleted ? 'Treasure Island' : `Island ${leaderTeam.currentMilestone} of ${totalStages}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>👑</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#FFC857' }}>Voyage Goal</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#FFC857' }}>Golden Treasure Chest</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
