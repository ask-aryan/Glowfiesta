'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { playDingSound, playResetSound } from '@/lib/buzzerSound'

interface FormattedBuzz {
  rank: number
  teamName: string
  buzzedAtMs: number
  deltaMs: number
  formattedTime: string
}

interface Participant {
  teamName: string
  joinedAt: number
}

interface RoomData {
  roomCode: string
  name: string
  status: 'DRAFT' | 'READY' | 'LIVE'
  roundNumber: number
  liveAt: number | null
  firstBuzzAt: number | null
  isHost: boolean
  participants: Participant[]
  buzzes: FormattedBuzz[]
  serverTime: number
}

export default function HostBuzzerRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomCode = String(params.roomCode || '').toUpperCase()

  const [hostKey, setHostKey] = useState('')
  const [room, setRoom] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // QR Code state
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)

  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0)
  const prevBuzzesCountRef = useRef(0)

  // Generate QR Code for the shared link
  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) return
    const shareUrl = `${window.location.origin}/buzzer/${roomCode}`
    import('qrcode')
      .then(QRCode => {
        QRCode.toDataURL(shareUrl, {
          width: 360,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        })
          .then(url => setQrDataUrl(url))
          .catch(() => {})
      })
      .catch(() => {})
  }, [roomCode])

  // Initialize host key from URL query or localStorage
  useEffect(() => {
    let key = searchParams.get('key') || ''
    if (!key && typeof window !== 'undefined') {
      key = localStorage.getItem(`buzzer_host_${roomCode}`) || ''
    }
    if (key) {
      setHostKey(key)
    }
  }, [searchParams, roomCode])

  // Poll room data every 350ms
  useEffect(() => {
    if (!roomCode) return
    let active = true

    async function fetchRoom() {
      try {
        const url = `/api/buzzer/${roomCode}${hostKey ? `?hostKey=${encodeURIComponent(hostKey)}` : ''}`
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) setErrorMsg('Room not found')
          return
        }
        const data: RoomData = await res.json()
        if (active) {
          setRoom(data)
          setLoading(false)

          // Play Ding sound if a new buzz arrived!
          if (data.buzzes.length > prevBuzzesCountRef.current) {
            playDingSound()
          }
          prevBuzzesCountRef.current = data.buzzes.length
        }
      } catch (err) {
        // network glitch
      }
    }

    fetchRoom()
    const timer = setInterval(fetchRoom, 350)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [roomCode, hostKey])

  // Stopwatch timer logic: starts from firstBuzzAt (or liveAt) until Host resets
  useEffect(() => {
    const timerStartBase = room?.firstBuzzAt || (room?.status === 'LIVE' ? room.liveAt : null)
    if (!timerStartBase) {
      setElapsedMs(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - timerStartBase))
    }, 40)

    return () => clearInterval(interval)
  }, [room?.firstBuzzAt, room?.liveAt, room?.status])

  // Format stopwatch MM:SS.mmm
  function formatStopwatch(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor(ms % 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
  }

  // Change stage (DRAFT, READY, LIVE)
  async function handleSetStatus(newStatus: 'DRAFT' | 'READY' | 'LIVE') {
    if (!hostKey || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/buzzer/${roomCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, status: newStatus }),
      })
      const data = await res.json()
      if (data.success && room) {
        setRoom({ ...room, status: newStatus, liveAt: data.liveAt })
      }
    } catch {}
    setActionLoading(false)
  }

  // Reset all buzzers
  async function handleReset(nextStatus: 'READY' | 'LIVE' | 'DRAFT' = 'READY') {
    if (!hostKey || actionLoading) return
    setActionLoading(true)
    playResetSound()
    try {
      const res = await fetch(`/api/buzzer/${roomCode}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, nextStatus }),
      })
      const data = await res.json()
      if (data.success && room) {
        setRoom({
          ...room,
          status: data.status,
          roundNumber: data.roundNumber,
          buzzes: [],
          firstBuzzAt: null,
          liveAt: data.status === 'LIVE' ? Date.now() : null,
        })
        setElapsedMs(0)
        prevBuzzesCountRef.current = 0
      }
    } catch {}
    setActionLoading(false)
  }

  function handleCopyShareLink() {
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/buzzer/${roomCode}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (loading && !room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d021a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '4px solid rgba(255,158,44,0.3)',
            borderTopColor: '#FF9E2C',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Connecting to Host Room…</div>
      </div>
    )
  }

  if (errorMsg || !room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d021a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 50, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          {errorMsg || 'Room not available'}
        </div>
        <Link
          href="/buzzer"
          style={{
            marginTop: 16,
            padding: '12px 24px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
            color: '#fff',
            textDecoration: 'none',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
          }}
        >
          Create New Room
        </Link>
      </div>
    )
  }

  const currentStage = room.status

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #24073d 0%, #0d011c 55%, #05000a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Host Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/buzzer"
            style={{
              color: '#ffd9b8',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Buzzer Arena
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700 }}>
              {room.name}
            </div>
            <div style={{ fontSize: 12, color: '#ffd9b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>CODE:</span>
              <span
                style={{
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '.08em',
                  color: '#FFC857',
                  background: 'rgba(255,200,87,0.14)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                {roomCode}
              </span>
              <span>• Round {room.roundNumber}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Share button */}
          <button
            onClick={handleCopyShareLink}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
              color: copied ? '#4ade80' : '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all .15s ease',
            }}
          >
            <span>{copied ? '✓ LINK COPIED!' : '📋 COPY PARTICIPANT LINK'}</span>
          </button>

          {/* QR Code button */}
          <button
            onClick={() => setShowQrModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(255,200,87,0.14)',
              border: '1.5px solid rgba(255,200,87,0.45)',
              color: '#FFC857',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all .15s ease',
            }}
          >
            <span>📱</span>
            <span>SHOW QR CODE</span>
          </button>

          {/* Stage badge */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'Fredoka, sans-serif',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              background:
                currentStage === 'LIVE'
                  ? 'rgba(239,68,68,0.25)'
                  : currentStage === 'READY'
                  ? 'rgba(234,179,8,0.25)'
                  : 'rgba(255,255,255,0.1)',
              border: `1.5px solid ${
                currentStage === 'LIVE'
                  ? '#ef4444'
                  : currentStage === 'READY'
                  ? '#eab308'
                  : 'rgba(255,255,255,0.25)'
              }`,
              color:
                currentStage === 'LIVE'
                  ? '#f87171'
                  : currentStage === 'READY'
                  ? '#fde047'
                  : '#cbd5e1',
            }}
          >
            ● {currentStage}
          </div>
        </div>
      </header>

      {/* Main Host Area */}
      <main
        style={{
          flex: 1,
          maxWidth: 1080,
          margin: '0 auto',
          width: '100%',
          padding: '24px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* TOP STOPWATCH / TIMER */}
        <section
          style={{
            background: 'linear-gradient(145deg, rgba(20,5,35,0.9), rgba(10,2,18,0.9))',
            border: '2px solid rgba(255,158,44,0.35)',
            borderRadius: 24,
            padding: '24px 28px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
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
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>⏱️ ROUND STOPWATCH TIMER</span>
            {room.firstBuzzAt && (
              <span style={{ color: '#22c55e', fontSize: 11, background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                ACTIVE FROM 1ST BUZZ
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: 'Fredoka, monospace, sans-serif',
              fontSize: 'clamp(44px, 8vw, 76px)',
              fontWeight: 800,
              color: elapsedMs > 0 ? '#FFC857' : '#887d9c',
              letterSpacing: '.04em',
              textShadow: elapsedMs > 0 ? '0 0 24px rgba(255,200,87,0.4)' : 'none',
              lineHeight: 1,
            }}
          >
            {formatStopwatch(elapsedMs)}
          </div>
          <div style={{ fontSize: 13, color: '#a394bb', marginTop: 8 }}>
            {elapsedMs > 0
              ? 'Timer running continuously until you hit Reset'
              : 'Timer triggers as soon as the first buzzer is pressed'}
          </div>
        </section>

        {/* STAGE CONTROLS & RESET BUTTON */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Stage Selector */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.05em' }}>
              ROUND STAGE CONTROLS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {/* DRAFT */}
              <button
                onClick={() => handleSetStatus('DRAFT')}
                disabled={actionLoading}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: currentStage === 'DRAFT' ? '2px solid #94a3b8' : '1px solid rgba(255,255,255,0.12)',
                  background: currentStage === 'DRAFT' ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.05)',
                  color: currentStage === 'DRAFT' ? '#fff' : '#94a3b8',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                ⚪ DRAFT
              </button>

              {/* READY */}
              <button
                onClick={() => handleSetStatus('READY')}
                disabled={actionLoading}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: currentStage === 'READY' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.12)',
                  background: currentStage === 'READY' ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.05)',
                  color: currentStage === 'READY' ? '#fde047' : '#ca8a04',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                🟡 READY
              </button>

              {/* LIVE */}
              <button
                onClick={() => handleSetStatus('LIVE')}
                disabled={actionLoading}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: currentStage === 'LIVE' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                  background: currentStage === 'LIVE' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.05)',
                  color: currentStage === 'LIVE' ? '#fff' : '#ef4444',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: currentStage === 'LIVE' ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
                  transition: 'all .15s ease',
                }}
              >
                🔴 GO LIVE
              </button>
            </div>
          </div>

          {/* RESET BUTTON */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px solid rgba(255,158,44,0.3)',
              borderRadius: 20,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.05em', marginBottom: 12 }}>
              BUZZER RESET ACTION
            </div>
            <button
              onClick={() => handleReset('READY')}
              disabled={actionLoading}
              style={{
                height: 48,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #FF9E2C, #FF6B35 60%, #e8431a)',
                color: '#fff',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '.04em',
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(255,107,53,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>🔁</span>
              <span>RESET ALL BUZZERS</span>
            </button>
          </div>
        </section>

        {/* BUZZERS LIST IN MILLISECOND ORDER */}
        <section
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, margin: 0 }}>
                Live Buzzer Leaderboard
              </h2>
              <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 2 }}>
                Ordered with millisecond precision
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#a394bb' }}>
              {room.buzzes.length} {room.buzzes.length === 1 ? 'buzz' : 'buzzes'} in Round {room.roundNumber}
            </div>
          </div>

          {room.buzzes.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.12)',
                color: '#8b7fa8',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                {currentStage === 'LIVE' ? '🚨' : currentStage === 'READY' ? '🟡' : '🔒'}
              </div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, color: '#ffd9b8', fontWeight: 600 }}>
                {currentStage === 'LIVE'
                  ? 'Waiting for first team to buzz!'
                  : currentStage === 'READY'
                  ? 'Buzzers primed. Switch to LIVE to begin!'
                  : 'Room is in Draft mode. Put in Ready or Live when ready.'}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Participant buzzes will appear here in exact millisecond order.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {room.buzzes.map(buzz => {
                const isFirst = buzz.rank === 1
                return (
                  <div
                    key={buzz.teamName}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: isFirst ? '18px 22px' : '14px 20px',
                      borderRadius: 18,
                      background: isFirst
                        ? 'linear-gradient(135deg, rgba(255,200,87,0.2) 0%, rgba(255,107,53,0.15) 100%)'
                        : 'rgba(255,255,255,0.04)',
                      border: isFirst ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isFirst ? '0 8px 30px rgba(255,200,87,0.25)' : 'none',
                      animation: 'pop .35s both',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: isFirst ? 46 : 38,
                          height: isFirst ? 46 : 38,
                          borderRadius: '50%',
                          background: isFirst
                            ? 'linear-gradient(135deg, #FFC857, #FFA23A)'
                            : buzz.rank === 2
                            ? '#94a3b8'
                            : buzz.rank === 3
                            ? '#b45309'
                            : 'rgba(255,255,255,0.12)',
                          color: isFirst ? '#000' : '#fff',
                          fontFamily: 'Fredoka, sans-serif',
                          fontWeight: 800,
                          fontSize: isFirst ? 20 : 16,
                          display: 'grid',
                          placeItems: 'center',
                          boxShadow: isFirst ? '0 4px 14px rgba(255,200,87,0.4)' : 'none',
                        }}
                      >
                        #{buzz.rank}
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: 'Fredoka, sans-serif',
                            fontSize: isFirst ? 20 : 17,
                            fontWeight: 700,
                            color: isFirst ? '#FFC857' : '#fff',
                          }}
                        >
                          {buzz.teamName}
                        </div>
                        {isFirst && (
                          <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>
                            🏆 FIRST TO BUZZ!
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'Fredoka, monospace, sans-serif',
                          fontSize: isFirst ? 22 : 17,
                          fontWeight: 800,
                          color: isFirst ? '#FFC857' : '#cbd5e1',
                          letterSpacing: '.04em',
                        }}
                      >
                        {buzz.formattedTime}
                      </div>
                      <div style={{ fontSize: 11, color: '#8b7fa8' }}>
                        {isFirst ? '0 ms delta' : `+${buzz.deltaMs} ms`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* SHARE & QR CODE SECTION */}
        <section
          style={{
            background: 'linear-gradient(145deg, rgba(255,200,87,0.06), rgba(255,107,53,0.03))',
            border: '1.5px solid rgba(255,200,87,0.3)',
            borderRadius: 20,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {qrDataUrl && (
              <div
                onClick={() => setShowQrModal(true)}
                title="Click to enlarge QR code"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 14,
                  background: '#fff',
                  padding: 6,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                  flexShrink: 0,
                  transition: 'transform .15s ease',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Join Party QR Code"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFC857' }}>
                Share with Participants
              </div>
              <div style={{ fontSize: 13, color: '#e5d9f2', margin: '4px 0 8px' }}>
                Players can scan the QR code with their camera or open the party link:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'Fredoka, monospace',
                    fontSize: 14,
                    color: '#fff',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}/buzzer/${roomCode}` : ''}
                </span>
                <button
                  onClick={handleCopyShareLink}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: copied ? '#4ade80' : '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ COPIED' : 'COPY'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 14,
              border: 0,
              background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
              color: '#000',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(255,200,87,0.35)',
            }}
          >
            <span>📱</span>
            <span>PROJECT QR CODE FULLSCREEN</span>
          </button>
        </section>

        {/* CONNECTED TEAMS DRAWER */}
        <section
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffd9b8' }}>
              Connected Teams ({room.participants.length})
            </div>
            <div style={{ fontSize: 12, color: '#8b7fa8' }}>
              Room Link: {typeof window !== 'undefined' ? `${window.location.origin}/buzzer/${roomCode}` : ''}
            </div>
          </div>
          {room.participants.length === 0 ? (
            <div style={{ fontSize: 13, color: '#8b7fa8' }}>
              No teams connected yet. Share the participant link or code <b>{roomCode}</b>.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {room.participants.map(p => (
                <div
                  key={p.teamName}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span>{p.teamName}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FULLSCREEN QR CODE MODAL FOR AUDIENCE / PROJECTOR */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,1,10,0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
            animation: 'pop .25s ease-out',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowQrModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'linear-gradient(145deg, #240a38 0%, #110220 100%)',
              border: '2px solid rgba(255,200,87,0.5)',
              borderRadius: 28,
              padding: '32px 28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,87,0.2)',
              color: '#fff',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.1)',
                border: 0,
                width: 36,
                height: 36,
                borderRadius: '50%',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              ✕
            </button>

            <div style={{ fontSize: 32, marginBottom: 6 }}>📱</div>
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, margin: '0 0 6px', color: '#FFC857' }}>
              Scan to Join Party!
            </h3>
            <div style={{ fontSize: 14, color: '#ffd9b8', marginBottom: 20 }}>
              Point your phone camera at the screen to slam the buzzer
            </div>

            {qrDataUrl && (
              <div
                style={{
                  background: '#fff',
                  padding: 14,
                  borderRadius: 20,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  marginBottom: 20,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Join Party QR"
                  style={{ width: 280, height: 280, display: 'block', borderRadius: 8 }}
                />
              </div>
            )}

            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,200,87,0.3)',
                borderRadius: 14,
                padding: '10px 18px',
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.08em' }}>
                ROOM CODE
              </div>
              <div
                style={{
                  fontFamily: 'Fredoka, monospace',
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#FFC857',
                  letterSpacing: '.12em',
                }}
              >
                {roomCode}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={handleCopyShareLink}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  background: copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
                  color: copied ? '#4ade80' : '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>{copied ? '✓ COPIED' : '📋 COPY LINK'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
