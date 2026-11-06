'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import QRCode from 'qrcode'
import { DecorationEventState, DecorationTeam, DecorationCriteria } from '@/lib/decoration'

export default function DecorationLiveLeaderboardPage() {
  const [data, setData] = useState<DecorationEventState | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Fanfare Web Audio synthesizer
  const playFanfare = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12)
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.12 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 1.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.12)
        osc.stop(ctx.currentTime + idx * 0.12 + 1.3)
      })
    } catch {}
  }, [])

  // Confetti celebration
  const fireConfetti = useCallback(() => {
    try {
      const end = Date.now() + 3 * 1000
      const colors = ['#FFC857', '#FFA23A', '#e8962a', '#ffffff', '#eab308', '#22c55e']

      ;(function frame() {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors,
        })
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors,
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      })()

      confetti({
        particleCount: 100,
        spread: 110,
        origin: { y: 0.5 },
        colors,
      })
    } catch {}
  }, [])

  // Generate QR code for /decoration
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/decoration`
    QRCode.toDataURL(url, {
      width: 260,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [])

  // Poll state every 2 seconds
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const res = await fetch(`/api/decoration?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (isMounted && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {}
    }
    loadData()
    const timer = setInterval(loadData, 2000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  // Fullscreen Toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  function handleRevealWinner() {
    setRevealed(true)
    playFanfare()
    fireConfetti()
  }

  const teams = data?.teams || []
  const criteria = data?.criteria || []
  const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
  const winner = sorted[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at 50% 10%, #200833 0%, #0c0217 60%, #05000a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255,200,87,0.2)',
          background: 'rgba(5,1,10,0.6)',
          backdropFilter: 'blur(12px)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>✨</span>
          <div>
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                background: 'linear-gradient(180deg, #fff0b3, #FFC857 55%, #e8962a)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '.03em',
              }}
            >
              GLOWFIESTA 2026: DECORATION CONTEST
            </div>
            <div style={{ fontSize: 11, color: '#ffd9b8', letterSpacing: '.25em', textTransform: 'uppercase' }}>
              OFFICIAL DESK & BAY DECORATION LEADERBOARD
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? '⤢ Exit Fullscreen' : '⤢ Fullscreen (F)'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 36px 40px',
          boxSizing: 'border-box',
          maxWidth: 1600,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Banner with Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 24,
            padding: '18px 26px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,200,87,0.3)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background:
                    data?.status === 'ACTIVE'
                      ? 'rgba(34,197,94,0.2)'
                      : data?.status === 'PAUSED'
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(239,68,68,0.2)',
                  color:
                    data?.status === 'ACTIVE'
                      ? '#86efac'
                      : data?.status === 'PAUSED'
                      ? '#fde68a'
                      : '#fca5a5',
                  border: `1px solid ${
                    data?.status === 'ACTIVE'
                      ? '#22c55e'
                      : data?.status === 'PAUSED'
                      ? '#f59e0b'
                      : '#ef4444'
                  }`,
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {data?.status === 'ACTIVE' && '● LIVE SCORING IN PROGRESS'}
                {data?.status === 'PAUSED' && '⏸️ SCORING PAUSED'}
                {data?.status === 'STOPPED' && '🛑 SCORING CLOSED'}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                margin: '8px 0 2px',
                color: '#fff',
              }}
            >
              Bay & Desk Decoration Competition
            </h1>
            <div style={{ fontSize: 14, color: '#ffd9b8' }}>
              All team counters evaluated on {criteria.length} festive factors: {criteria.map(c => c.name).join(' • ')}
            </div>
          </div>

          {/* Stats Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                background: 'rgba(255,200,87,0.12)',
                border: '1.5px solid rgba(255,200,87,0.4)',
                borderRadius: 16,
                padding: '10px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FFC857', textTransform: 'uppercase' }}>
                Ballots Cast
              </div>
              <div style={{ fontSize: 28, fontFamily: 'Fredoka, sans-serif', fontWeight: 800 }}>
                {data?.totalBallots || 0}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(168,85,247,0.12)',
                border: '1.5px solid rgba(168,85,247,0.4)',
                borderRadius: 16,
                padding: '10px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase' }}>
                Team Counters
              </div>
              <div style={{ fontSize: 28, fontFamily: 'Fredoka, sans-serif', fontWeight: 800 }}>
                {teams.length}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Leaderboard on Left, QR Code on Right */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 280px',
            gap: 24,
          }}
        >
          {/* Teams Leaderboard Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sorted.map((team, rankIdx) => {
              const isWin = rankIdx === 0 && team.totalScore > 0
              return (
                <div
                  key={team.id}
                  style={{
                    background: isWin
                      ? 'linear-gradient(135deg, rgba(255,200,87,0.18) 0%, rgba(255,107,53,0.12) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: isWin ? '2.5px solid #FFC857' : '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 22,
                    padding: '20px 24px',
                    boxShadow: isWin ? '0 12px 40px rgba(255,200,87,0.3)' : '0 6px 20px rgba(0,0,0,0.2)',
                    transition: 'all .3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isWin ? '#FFC857' : rankIdx === 1 ? '#94a3b8' : rankIdx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                          color: isWin ? '#000' : '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 22,
                          fontWeight: 900,
                          boxShadow: isWin ? '0 4px 16px rgba(255,200,87,0.5)' : 'none',
                        }}
                      >
                        {rankIdx === 0 ? '👑' : `#${rankIdx + 1}`}
                      </div>

                      {team.photoUrl && (
                        <img
                          src={team.photoUrl}
                          alt={team.name}
                          style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: isWin ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.2)' }}
                        />
                      )}

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              background: isWin ? '#FFC857' : 'rgba(255,255,255,0.12)',
                              color: isWin ? '#000' : '#fff',
                              fontSize: 12,
                              fontWeight: 900,
                              padding: '2px 10px',
                              borderRadius: 999,
                            }}
                          >
                            COUNTER #{team.teamNumber}
                          </span>
                          <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                            {team.name}
                          </span>
                        </div>
                        {team.description && (
                          <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 3 }}>{team.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Scores display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Average Score</div>
                        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, color: '#86efac' }}>
                          {team.averageScore} pts
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', borderLeft: '1.5px solid rgba(255,255,255,0.15)', paddingLeft: 22 }}>
                        <div style={{ fontSize: 11, color: '#FFC857', textTransform: 'uppercase' }}>Total Cumulative</div>
                        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 32, fontWeight: 900, color: '#FFC857', lineHeight: 1 }}>
                          {team.totalScore}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Criteria Factor Chips */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {criteria.map(c => {
                      const cData = team.criteriaBreakdown[c.id] || { average: 0, total: 0 }
                      return (
                        <div
                          key={c.id}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            display: 'flex',
                            gap: 6,
                          }}
                        >
                          <span style={{ color: '#ffd9b8' }}>{c.name}:</span>
                          <span style={{ fontWeight: 800, color: '#fff' }}>{cData.average} / {c.maxScore}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right QR Code Panel */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,200,87,0.12), rgba(255,107,53,0.08))',
              borderRadius: 22,
              border: '2px solid rgba(255,200,87,0.4)',
              padding: '24px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#FFC857', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Scan to Judge
            </div>

            {qrDataUrl ? (
              <div style={{ padding: 10, background: '#fff', borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <img src={qrDataUrl} alt="Decoration QR" style={{ width: 190, height: 190, display: 'block' }} />
              </div>
            ) : (
              <div style={{ width: 190, height: 190, background: '#fff', borderRadius: 16 }} />
            )}

            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 14 }}>
              Point Phone Camera
            </div>
            <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 4, maxWidth: 220 }}>
              Visit every counter • Score each team on all factors • 1 ballot per device
            </div>

            {/* Celebrate Winner Button */}
            <div style={{ marginTop: 20, width: '100%' }}>
              <button
                onClick={handleRevealWinner}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                  color: '#000',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,200,87,0.4)',
                }}
              >
                🎉 Celebrate Winner!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
