'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { playBuzzerSound } from '@/lib/buzzerSound'

interface MyBuzz {
  rank: number
  teamName: string
  buzzedAtMs: number
  deltaMs: number
  formattedTime: string
}

interface RoomData {
  roomCode: string
  name: string
  status: 'DRAFT' | 'READY' | 'LIVE'
  roundNumber: number
  liveAt: number | null
  firstBuzzAt: number | null
  myBuzz: MyBuzz | null
  serverTime: number
}

export default function ParticipantBuzzerPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = String(params.roomCode || '').toUpperCase()

  const [teamName, setTeamName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [hasJoined, setHasJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const [room, setRoom] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Local buzz state
  const [buzzing, setBuzzing] = useState(false)
  const [myBuzz, setMyBuzz] = useState<MyBuzz | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [isPressingDown, setIsPressingDown] = useState(false)

  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0)
  const prevRoundRef = useRef<number>(1)

  // Load saved team name for this room from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) return
    const saved = localStorage.getItem(`buzzer_team_${roomCode}`)
    if (saved) {
      setTeamName(saved)
      setHasJoined(true)
    }
  }, [roomCode])

  // Stopwatch timer logic with clock offset compensation
  const serverOffsetRef = useRef<number>(0)

  // Poll room every 250ms
  useEffect(() => {
    if (!roomCode || !hasJoined) return
    let active = true

    async function poll() {
      try {
        const url = `/api/buzzer/${roomCode}${teamName ? `?teamName=${encodeURIComponent(teamName)}` : ''}`
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) setErrorMsg('Room not found')
          return
        }
        const data: RoomData = await res.json()
        if (active) {
          if (data.serverTime) {
            serverOffsetRef.current = Date.now() - data.serverTime
          }
          setRoom(data)
          setLoading(false)

          // If Host reset and incremented round, clear local buzz!
          if (data.roundNumber !== prevRoundRef.current) {
            setMyBuzz(null)
            setFeedbackMsg('')
            prevRoundRef.current = data.roundNumber
          } else if (data.myBuzz) {
            setMyBuzz(data.myBuzz)
          }
        }
      } catch {
        // network glitch
      }
    }

    poll()
    const timer = setInterval(poll, 250)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [roomCode, hasJoined, teamName])

  // Stopwatch timer logic: starts from firstBuzzAt (or liveAt) until Host resets
  useEffect(() => {
    const timerStartBase = room?.firstBuzzAt || (room?.status === 'LIVE' ? room.liveAt : null)
    if (!timerStartBase) {
      setElapsedMs(0)
      return
    }

    const interval = setInterval(() => {
      const nowSynced = Date.now() - serverOffsetRef.current
      setElapsedMs(Math.max(0, nowSynced - timerStartBase))
    }, 40)

    return () => clearInterval(interval)
  }, [room?.firstBuzzAt, room?.liveAt, room?.status])

  function formatStopwatch(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor(ms % 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
  }

  // Handle joining room
  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = nameInput.trim()
    if (!clean) return
    setJoining(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/buzzer/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: clean }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to join')
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`buzzer_team_${roomCode}`, clean)
      }
      setTeamName(clean)
      setHasJoined(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error joining room')
    }
    setJoining(false)
  }

  // Handle Buzz action
  async function handleBuzz() {
    if (buzzing || myBuzz) return
    if (!room || room.status !== 'LIVE') {
      if (room?.status === 'READY') {
        setFeedbackMsg('⚠️ Wait for LIVE! Host has not activated buzzers yet.')
        setTimeout(() => setFeedbackMsg(''), 2000)
      }
      return
    }

    setBuzzing(true)
    playBuzzerSound()

    try {
      const res = await fetch(`/api/buzzer/${roomCode}/buzz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, clientTimeMs: Date.now() }),
      })
      const data = await res.json()
      if (data.success) {
        setMyBuzz({
          rank: data.rank,
          teamName,
          buzzedAtMs: data.press?.buzzedAtMs || Date.now(),
          deltaMs: data.press?.deltaMs || 0,
          formattedTime: data.rank === 1 ? '0.000s' : `+${((data.press?.deltaMs || 0) / 1000).toFixed(3)}s`,
        })
      } else {
        setFeedbackMsg(data.message || 'Buzz missed!')
      }
    } catch {
      setFeedbackMsg('Network error sending buzz')
    }
    setBuzzing(false)
  }

  // Initial screen: Enter Team Name if not joined yet
  if (!hasJoined) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 25%, #2a0845 0%, #110022 60%, #06000c 100%)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,158,44,0.3)',
            borderRadius: 24,
            padding: 32,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>
            Join Buzzer Room
          </h1>
          <div style={{ fontSize: 13, color: '#ffd9b8', marginBottom: 24 }}>
            ROOM CODE: <b style={{ color: '#FFC857', letterSpacing: '.06em' }}>{roomCode}</b>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                YOUR TEAM OR PLAYER NAME
              </label>
              <input
                type="text"
                placeholder="e.g. Thunderbolts"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={40}
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  background: 'rgba(10,3,20,0.7)',
                  color: '#fff',
                  fontSize: 16,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={joining}
              style={{
                height: 52,
                borderRadius: 14,
                border: 0,
                background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                color: '#fff',
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 18,
                fontWeight: 700,
                cursor: joining ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
                marginTop: 6,
              }}
            >
              {joining ? 'JOINING…' : 'ENTER ARENA 🚀'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const stage = room?.status || 'DRAFT'
  const isLive = stage === 'LIVE'
  const isReady = stage === 'READY'
  const isDraft = stage === 'DRAFT'
  const hasBuzzed = Boolean(myBuzz)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #290a42 0%, #0d011c 60%, #05000a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22 }}>⚡</div>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {teamName}
            </div>
            <div style={{ fontSize: 11, color: '#ffd9b8' }}>
              ROOM {roomCode} • ROUND {room?.roundNumber || 1}
            </div>
          </div>
        </div>

        {/* Change Name button */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`buzzer_team_${roomCode}`)
            }
            setHasJoined(false)
          }}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            padding: '4px 12px',
            color: '#a394bb',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Change Name
        </button>
      </header>

      {/* Main Arena */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 20px 40px',
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* TOP DIGITAL STOPWATCH TIMER */}
        <section
          style={{
            width: '100%',
            background: 'linear-gradient(145deg, rgba(20,5,35,0.9), rgba(10,2,18,0.9))',
            border: '2px solid rgba(255,158,44,0.35)',
            borderRadius: 22,
            padding: '18px 20px',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: '#ffd9b8',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>⏱️ ROUND STOPWATCH TIMER</span>
            {room?.firstBuzzAt && (
              <span style={{ color: '#22c55e', fontSize: 11, background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                1ST BUZZ RECORDED
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'Fredoka, monospace, sans-serif',
              fontSize: 'clamp(46px, 11vw, 68px)',
              fontWeight: 800,
              color: elapsedMs > 0 ? '#FFC857' : '#887d9c',
              letterSpacing: '.04em',
              textShadow: elapsedMs > 0 ? '0 0 24px rgba(255,200,87,0.45)' : 'none',
              lineHeight: 1.1,
            }}
          >
            {formatStopwatch(elapsedMs)}
          </div>
          <div style={{ fontSize: 12, color: '#a394bb', marginTop: 4 }}>
            {elapsedMs > 0
              ? 'Elapsed time until host resets for next question'
              : 'Timer triggers on first buzzer press'}
          </div>
        </section>

        {/* STAGE STATUS BANNER */}
        <div style={{ textAlign: 'center', margin: '20px 0 10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 999,
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              background: hasBuzzed
                ? 'rgba(34,197,94,0.2)'
                : isLive
                ? 'rgba(239,68,68,0.25)'
                : isReady
                ? 'rgba(234,179,8,0.25)'
                : 'rgba(255,255,255,0.08)',
              border: `2px solid ${
                hasBuzzed
                  ? '#22c55e'
                  : isLive
                  ? '#ef4444'
                  : isReady
                  ? '#eab308'
                  : 'rgba(255,255,255,0.2)'
              }`,
              color: hasBuzzed
                ? '#4ade80'
                : isLive
                ? '#f87171'
                : isReady
                ? '#fde047'
                : '#94a3b8',
              boxShadow: isLive && !hasBuzzed ? '0 0 24px rgba(239,68,68,0.45)' : 'none',
              animation: isReady ? 'pulse 1.2s infinite' : 'none',
            }}
          >
            <span>
              {hasBuzzed
                ? '✅ BUZZED IN'
                : isLive
                ? '🔥 BUZZERS ACTIVE — SLAM NOW!'
                : isReady
                ? '⚠️ GET READY! BUZZER ARMED'
                : '🔒 WAITING FOR HOST'}
            </span>
          </div>

          {feedbackMsg && (
            <div style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* THE GIANT BUZZER BUTTON */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px 0',
          }}
        >
          {/* Pulsing ring when LIVE */}
          {isLive && !hasBuzzed && (
            <div
              style={{
                position: 'absolute',
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239,68,68,0.4), transparent 70%)',
                animation: 'burst 1.6s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Outer Chrome Bezel */}
          <div
            style={{
              width: 250,
              height: 250,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #3d3b45 0%, #15131b 100%)',
              border: '6px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 3px 6px rgba(255,255,255,0.2)',
              display: 'grid',
              placeItems: 'center',
              padding: 10,
              boxSizing: 'border-box',
            }}
          >
            {/* The Actual Slammer Button */}
            <button
              onClick={handleBuzz}
              onMouseDown={() => setIsPressingDown(true)}
              onMouseUp={() => setIsPressingDown(false)}
              onTouchStart={() => setIsPressingDown(true)}
              onTouchEnd={() => setIsPressingDown(false)}
              disabled={hasBuzzed || isDraft}
              aria-label="Slam Buzzer"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: 'none',
                cursor: isLive && !hasBuzzed ? 'pointer' : 'default',
                background: hasBuzzed
                  ? 'radial-gradient(circle at 35% 35%, #22c55e 0%, #15803d 70%, #14532d 100%)'
                  : isLive
                  ? 'radial-gradient(circle at 35% 35%, #ff4b4b 0%, #dc2626 65%, #991b1b 100%)'
                  : isReady
                  ? 'radial-gradient(circle at 35% 35%, #facc15 0%, #ca8a04 65%, #854d0e 100%)'
                  : 'radial-gradient(circle at 35% 35%, #64748b 0%, #475569 65%, #1e293b 100%)',
                boxShadow: isPressingDown
                  ? 'inset 0 8px 24px rgba(0,0,0,0.7)'
                  : hasBuzzed
                  ? '0 10px 28px rgba(34,197,94,0.5), inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.4)'
                  : isLive
                  ? '0 14px 36px rgba(239,68,68,0.65), inset 0 -10px 20px rgba(0,0,0,0.5), inset 0 8px 14px rgba(255,255,255,0.45)'
                  : isReady
                  ? '0 10px 28px rgba(234,179,8,0.45), inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.4)'
                  : '0 6px 18px rgba(0,0,0,0.4)',
                transform: isPressingDown ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 0.08s ease, box-shadow 0.12s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'Fredoka, sans-serif',
                textAlign: 'center',
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: hasBuzzed ? 38 : isLive ? 44 : 36,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
              >
                {hasBuzzed ? '✓' : isLive ? '🚨' : isReady ? '⚠️' : '🔒'}
              </div>
              <div
                style={{
                  fontSize: hasBuzzed ? 22 : isLive ? 28 : 20,
                  fontWeight: 800,
                  letterSpacing: '.06em',
                  marginTop: 6,
                  textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                {hasBuzzed ? 'BUZZED!' : isLive ? 'BUZZ!' : isReady ? 'STAND BY' : 'LOCKED'}
              </div>
            </button>
          </div>
        </div>

        {/* BUZZ RESULT CARD (AFTER PRESSING) */}
        {hasBuzzed && (
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(20,83,45,0.25))',
              border: '2px solid #22c55e',
              borderRadius: 20,
              padding: '18px 22px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(34,197,94,0.3)',
              animation: 'pop .4s both',
            }}
          >
            <div style={{ fontSize: 13, color: '#86efac', fontWeight: 700, letterSpacing: '.06em' }}>
              ROUND {room?.roundNumber || 1} SUBMITTED
            </div>
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 32,
                fontWeight: 800,
                color: myBuzz?.rank === 1 ? '#FFC857' : '#fff',
                margin: '4px 0',
              }}
            >
              {myBuzz?.rank === 1 ? '🏆 1ST PLACE!' : `POSITION #${myBuzz?.rank}`}
            </div>
            <div style={{ fontSize: 14, color: '#dcfce7', fontFamily: 'Fredoka, monospace' }}>
              Time: <b>{myBuzz?.formattedTime}</b>
            </div>
            <div style={{ fontSize: 12, color: '#86efac', marginTop: 8 }}>
              Waiting for host to reset for the next question…
            </div>
          </div>
        )}

        {/* HELPER TEXT */}
        {!hasBuzzed && (
          <div style={{ textAlign: 'center', color: '#8b7fa8', fontSize: 13, marginTop: 12 }}>
            {isLive
              ? 'Tap the red button with your finger as fast as you can!'
              : isReady
              ? 'Get ready! The button will turn bright red when LIVE.'
              : 'Waiting for the host to start the round.'}
          </div>
        )}
      </main>
    </div>
  )
}
