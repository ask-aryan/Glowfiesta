'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import QRCode from 'qrcode'
import { ChoiceAwardsState, AwardCategory, AwardNominee } from '@/lib/choiceAwards'

export default function ChoiceAwardsLivePreviewPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastTotalVotes, setLastTotalVotes] = useState(0)
  const [counterPulse, setCounterPulse] = useState(false)
  const [localRevealed, setLocalRevealed] = useState(false)

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

  // Confetti burst
  const fireConfetti = useCallback(() => {
    try {
      const end = Date.now() + 3 * 1000
      const colors = ['#FFC857', '#FFA23A', '#e8962a', '#ffffff', '#eab308', '#a855f7']

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
        particleCount: 90,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      })
    } catch {}
  }, [])

  // Generate QR Code for /vote
  useEffect(() => {
    if (typeof window === 'undefined') return
    const voteUrl = `${window.location.origin}/vote`
    QRCode.toDataURL(voteUrl, {
      width: 260,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [])

  // Poll state every 1.5 seconds
  useEffect(() => {
    let active = true

    async function fetchState() {
      try {
        const res = await fetch(`/api/choice-awards?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && json.data) {
          setData(prev => {
            const next = json.data as ChoiceAwardsState
            // Detect reveal transition
            if (next.mode === 'CEREMONY' && next.ceremonyRevealed && !prev?.ceremonyRevealed) {
              playFanfare()
              fireConfetti()
            }
            return next
          })
          setLoading(false)
        }
      } catch {
        // network error
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 1500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [playFanfare, fireConfetti])

  // Current category based on mode
  const categories = data?.categories || []
  const activeCatIndex = categories.findIndex(c => c.id === data?.activeCategoryId)
  const currentActiveCat = activeCatIndex !== -1 ? categories[activeCatIndex] : categories[0] || null

  const ceremonyCatIndex = categories.findIndex(c => c.id === data?.ceremonyCategoryId)
  const currentCeremonyCat = ceremonyCatIndex !== -1 ? categories[ceremonyCatIndex] : categories[0] || null

  // Pulse animation when combined vote count increments
  useEffect(() => {
    if (currentActiveCat) {
      if (currentActiveCat.totalVotes > lastTotalVotes) {
        setCounterPulse(true)
        const t = setTimeout(() => setCounterPulse(false), 800)
        setLastTotalVotes(currentActiveCat.totalVotes)
        return () => clearTimeout(t)
      }
      setLastTotalVotes(currentActiveCat.totalVotes)
    }
  }, [currentActiveCat?.totalVotes])

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Check if any nominee in active category has a video
  const hasVideos = Boolean(currentActiveCat?.nominees?.some(n => Boolean(n.videoUrl)))
  const isCeremonyRevealed = Boolean(data?.ceremonyRevealed)

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
        position: 'relative',
      }}
    >
      {/* Oscars Golden Envelope Keyframe Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes envelopeFloat {
              0% { transform: translateY(0px) rotate(-0.3deg); }
              50% { transform: translateY(-7px) rotate(0.3deg); }
              100% { transform: translateY(0px) rotate(-0.3deg); }
            }
            @keyframes waxSealPulse {
              0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 4px 18px rgba(239, 68, 68, 0.6); }
              50% { transform: translate(-50%, -50%) scale(1.06); box-shadow: 0 6px 30px rgba(255, 200, 87, 0.8), 0 0 20px rgba(239, 68, 68, 0.9); }
            }
            @keyframes haloGlow {
              0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 200, 87, 0.4)); }
              50% { filter: drop-shadow(0 0 35px rgba(255, 200, 87, 0.85)); }
            }
            @keyframes letterRise {
              0% { transform: translateY(0px) scale(0.95); opacity: 0; }
              40% { opacity: 1; }
              100% { transform: translateY(-180px) scale(1.06); opacity: 1; }
            }
          `,
        }}
      />
      {/* Top Oscars Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid rgba(255,200,87,0.2)',
          background: 'rgba(5,1,10,0.6)',
          backdropFilter: 'blur(12px)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🏆</span>
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
              GLOWFIESTA CHOICE AWARDS 2026
            </div>
            <div style={{ fontSize: 11, color: '#ffd9b8', letterSpacing: '.25em', textTransform: 'uppercase' }}>
              {data?.mode === 'CEREMONY' ? '★ THE OSCARS GRAND CEREMONY ★' : '★ LIVE AUDIENCE VOTING BALLOT ★'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
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

      {/* Loading state */}
      {loading && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#ffd9b8' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24 }}>Connecting to Choice Awards Studio...</div>
          </div>
        </div>
      )}

      {/* No categories */}
      {!loading && categories.length === 0 && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#ffd9b8', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎬</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 28, margin: '0 0 10px' }}>
              Waiting for Host to Launch Awards
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.5 }}>
              The organizer has not launched any award questions yet. Open the host control to create award questions and nominees.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 1: LIVE VOTING DISPLAY (One by One with Combined Votes) */}
      {/* ============================================================ */}
      {!loading && data?.mode !== 'CEREMONY' && currentActiveCat && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 32px 36px',
            boxSizing: 'border-box',
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* Question Banner & Counter Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
              marginBottom: 20,
              padding: '18px 24px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid rgba(255,200,87,0.3)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                    color: '#fff',
                    padding: '4px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '.06em',
                  }}
                >
                  CATEGORY {activeCatIndex + 1} OF {categories.length}
                </span>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background:
                      data?.questionVotingState === 'VOTING'
                        ? 'rgba(34,197,94,0.2)'
                        : data?.questionVotingState === 'PAUSED'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(239,68,68,0.2)',
                    color:
                      data?.questionVotingState === 'VOTING'
                        ? '#86efac'
                        : data?.questionVotingState === 'PAUSED'
                        ? '#fde68a'
                        : '#fca5a5',
                    border: `1px solid ${
                      data?.questionVotingState === 'VOTING'
                        ? '#22c55e'
                        : data?.questionVotingState === 'PAUSED'
                        ? '#f59e0b'
                        : '#ef4444'
                    }`,
                  }}
                >
                  {data?.questionVotingState === 'VOTING' && '● LIVE VOTING OPEN'}
                  {data?.questionVotingState === 'PAUSED' && '⏸️ VOTING PAUSED'}
                  {data?.questionVotingState === 'STOPPED' && '🛑 VOTING CLOSED'}
                  {data?.questionVotingState === 'IDLE' && '⏳ GET READY'}
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
                {currentActiveCat.title}
              </h1>
              {currentActiveCat.subtitle && (
                <div style={{ fontSize: 16, color: '#ffd9b8' }}>{currentActiveCat.subtitle}</div>
              )}
            </div>

            {/* Combined Vote Counter Box (Individual counts are strictly hidden) */}
            <div
              style={{
                background: counterPulse ? 'rgba(255,200,87,0.3)' : 'rgba(255,200,87,0.12)',
                border: '2px solid #FFC857',
                borderRadius: 18,
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transform: counterPulse ? 'scale(1.05)' : 'scale(1)',
                transition: 'all .25s ease',
                boxShadow: counterPulse ? '0 0 30px rgba(255,200,87,0.6)' : '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontSize: 36 }}>🔥</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#FFC857', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  Total Ballots Cast
                </div>
                <div style={{ fontSize: 32, fontFamily: 'Fredoka, sans-serif', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {currentActiveCat.totalVotes} Votes
                </div>
                <div style={{ fontSize: 10, color: '#ffd9b8', marginTop: 2 }}>
                  Results sealed until ceremony 🔒
                </div>
              </div>
            </div>
          </div>

          {/* Main Stage Grid: Split Video / Photos on Left, QR Code on Right */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 280px',
              gap: 24,
            }}
          >
            {/* Nominees Showcase (Split Video or Photo Cards) */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 22,
                padding: 20,
                border: '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffd9b8', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '.08em' }}>
                Nominees in this Category ({currentActiveCat.nominees.length})
              </div>

              {/* SPLIT VIDEO LAYOUT (If videos exist) */}
              {hasVideos ? (
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: currentActiveCat.nominees.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {currentActiveCat.nominees.map(n => (
                    <div
                      key={n.id}
                      style={{
                        position: 'relative',
                        borderRadius: 18,
                        overflow: 'hidden',
                        background: '#000',
                        border: '2px solid rgba(255,200,87,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 260,
                      }}
                    >
                      {n.videoUrl ? (
                        <video
                          src={n.videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            inset: 0,
                          }}
                        />
                      ) : n.photoUrl ? (
                        <img
                          src={n.photoUrl}
                          alt={n.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            inset: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 64,
                            background: 'linear-gradient(135deg, #1f0b2e, #0c0217)',
                          }}
                        >
                          {n.avatar || '⭐'}
                        </div>
                      )}

                      {/* Video overlay badge */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: 18,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{n.avatar || '⭐'}</span>
                          <div>
                            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                              {n.name}
                            </div>
                            {n.role && <div style={{ fontSize: 13, color: '#ffd9b8' }}>{n.role}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* PHOTO CARDS LAYOUT (When no videos) */
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    alignContent: 'start',
                  }}
                >
                  {currentActiveCat.nominees.map(n => (
                    <div
                      key={n.id}
                      style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderRadius: 20,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      }}
                    >
                      {n.photoUrl ? (
                        <img
                          src={n.photoUrl}
                          alt={n.name}
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #FFC857',
                            marginBottom: 12,
                            boxShadow: '0 4px 16px rgba(255,200,87,0.3)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '3px solid rgba(255,200,87,0.4)',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 44,
                            marginBottom: 12,
                          }}
                        >
                          {n.avatar || '⭐'}
                        </div>
                      )}

                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                        {n.name}
                      </div>
                      {n.role && (
                        <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
                          {n.role}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QR Code Panel */}
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
                Scan to Vote
              </div>

              {qrDataUrl ? (
                <div
                  style={{
                    padding: 10,
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                >
                  <img src={qrDataUrl} alt="Vote QR" style={{ width: 190, height: 190, display: 'block' }} />
                </div>
              ) : (
                <div style={{ width: 190, height: 190, background: '#fff', borderRadius: 16 }} />
              )}

              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 14 }}>
                Point Phone Camera
              </div>
              <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 4 }}>
                1 Vote Per Device • Live Synchronized
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: THE CEREMONY (Oscars Winner Reveal & Transparency) */}
      {/* ============================================================ */}
      {!loading && data?.mode === 'CEREMONY' && currentCeremonyCat && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 24px 40px',
            boxSizing: 'border-box',
            maxWidth: 1300,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* Category Banner */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,200,87,0.2)',
                border: '1.5px solid #FFC857',
                color: '#FFC857',
                padding: '4px 18px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              OSCARS AWARD {ceremonyCatIndex + 1} OF {categories.length}
            </div>

            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 'clamp(28px, 4.5vw, 44px)',
                margin: '0 0 6px',
                background: 'linear-gradient(180deg, #fff0b3, #FFC857 60%, #e8962a)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                fontWeight: 800,
                filter: 'drop-shadow(0 2px 14px rgba(255,200,87,0.4))',
              }}
            >
              {currentCeremonyCat.title}
            </h1>
            {currentCeremonyCat.subtitle && (
              <div style={{ fontSize: 17, color: '#ffd9b8', maxWidth: 650, margin: '0 auto' }}>
                {currentCeremonyCat.subtitle}
              </div>
            )}
          </div>

          {/* STAGE A: BEFORE REVEAL (Envelope Sealed) */}
          {!isCeremonyRevealed ? (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 18,
                  marginBottom: 36,
                }}
              >
                {currentCeremonyCat.nominees.map(n => (
                  <div
                    key={n.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.15)',
                      borderRadius: 22,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                    }}
                  >
                    {n.photoUrl ? (
                      <img
                        src={n.photoUrl}
                        alt={n.name}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #FFC857',
                          marginBottom: 14,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)',
                          border: '3px solid rgba(255,200,87,0.5)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 48,
                          marginBottom: 14,
                        }}
                      >
                        {n.avatar || '⭐'}
                      </div>
                    )}
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                      {n.name}
                    </div>
                    {n.role && <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>{n.role}</div>}
                  </div>
                ))}
              </div>

              {/* THE 3D GOLDEN ENVELOPE (SEALED) */}
              <div
                style={{
                  position: 'relative',
                  width: 480,
                  maxWidth: '92vw',
                  height: 280,
                  margin: '24px auto 32px',
                  perspective: 1200,
                  animation: 'envelopeFloat 3.5s ease-in-out infinite',
                }}
              >
                {/* Envelope Back & Interior */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255,200,87,0.25)',
                  }}
                >
                  <svg width="100%" height="100%" viewBox="0 0 480 280" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="envGoldBackSealed" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4a2800" />
                        <stop offset="40%" stopColor="#805400" />
                        <stop offset="100%" stopColor="#2b1400" />
                      </linearGradient>
                    </defs>
                    <rect width="480" height="280" rx="18" fill="url(#envGoldBackSealed)" stroke="#FFE082" strokeWidth="2.5" />
                  </svg>
                </div>

                {/* Envelope Front Pocket (Left, Right, Bottom folds) */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
                  <svg width="100%" height="100%" viewBox="0 0 480 280" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="envGoldLeftSealed" x1="0%" y1="0%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#ffd97d" />
                        <stop offset="50%" stopColor="#e5b839" />
                        <stop offset="100%" stopColor="#ba8b1e" />
                      </linearGradient>
                      <linearGradient id="envGoldRightSealed" x1="100%" y1="0%" x2="0%" y2="50%">
                        <stop offset="0%" stopColor="#ffd97d" />
                        <stop offset="50%" stopColor="#e5b839" />
                        <stop offset="100%" stopColor="#ba8b1e" />
                      </linearGradient>
                      <linearGradient id="envGoldBottomSealed" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" stopColor="#ffe699" />
                        <stop offset="40%" stopColor="#f3c647" />
                        <stop offset="100%" stopColor="#c8961d" />
                      </linearGradient>
                    </defs>
                    <polygon points="0,0 240,140 0,280" fill="url(#envGoldLeftSealed)" opacity="0.95" />
                    <polygon points="480,0 240,140 480,280" fill="url(#envGoldRightSealed)" opacity="0.95" />
                    <polygon points="0,280 240,140 480,280" fill="url(#envGoldBottomSealed)" stroke="#FFE082" strokeWidth="1" />
                  </svg>
                </div>

                {/* Top Flap (Closed with Wax Seal) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 145,
                    zIndex: 6,
                    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="100%" height="100%" viewBox="0 0 480 145" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="envGoldFlapSealed" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#fff3b0" />
                        <stop offset="40%" stopColor="#f5c742" />
                        <stop offset="100%" stopColor="#bf8915" />
                      </linearGradient>
                    </defs>
                    <polygon points="0,0 240,140 480,0" fill="url(#envGoldFlapSealed)" stroke="#FFF2B2" strokeWidth="2" />
                  </svg>

                  {/* Crimson Wax Seal Stamp */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 140,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, #ef4444 0%, #b91c1c 65%, #7f1d1d 100%)',
                      border: '2.5px solid #fca5a5',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      color: '#FFD700',
                      animation: 'waxSealPulse 2.5s infinite',
                    }}
                  >
                    👑
                  </div>
                </div>
              </div>

              {/* Status Notice: Waiting for Host to Open Envelope (NO reveal button) */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 32px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, rgba(255,200,87,0.15) 0%, rgba(255,107,53,0.1) 100%)',
                    border: '1.5px solid rgba(255,200,87,0.4)',
                    boxShadow: '0 6px 24px rgba(255,200,87,0.15)',
                  }}
                >
                  <span style={{ fontSize: 24, animation: 'haloGlow 2s infinite' }}>✉️</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#FFC857' }}>
                      The Golden Envelope is Sealed
                    </div>
                    <div style={{ fontSize: 13, color: '#ffd9b8' }}>
                      Awaiting host to open envelope from the control panel...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STAGE B: WINNER REVEALED + COMPLETE TRANSPARENCY STATS */
            <div style={{ width: '100%' }}>
              {/* Winner Showcase Card */}
              {(() => {
                const sorted = [...currentCeremonyCat.nominees].sort((a, b) => b.votesCount - a.votesCount)
                const winner = sorted[0]
                const runnerUp = sorted[1]
                const leadVotes = runnerUp ? winner.votesCount - runnerUp.votesCount : winner.votesCount

                return (
                  <div>
                    {/* OPENED 3D GOLDEN ENVELOPE (Flap flipped open, letter card elevated) */}
                    <div
                      style={{
                        position: 'relative',
                        width: 480,
                        maxWidth: '92vw',
                        height: 280,
                        margin: '180px auto 44px',
                        perspective: 1200,
                      }}
                    >
                      {/* Envelope Back & Interior */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 18,
                          overflow: 'hidden',
                          boxShadow: '0 25px 70px rgba(255,200,87,0.35), 0 10px 30px rgba(0,0,0,0.7)',
                        }}
                      >
                        <svg width="100%" height="100%" viewBox="0 0 480 280" style={{ display: 'block' }}>
                          <defs>
                            <linearGradient id="envGoldBackOpen" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4a2800" />
                              <stop offset="40%" stopColor="#805400" />
                              <stop offset="100%" stopColor="#2b1400" />
                            </linearGradient>
                          </defs>
                          <rect width="480" height="280" rx="18" fill="url(#envGoldBackOpen)" stroke="#FFE082" strokeWidth="2.5" />
                        </svg>
                      </div>

                      {/* Inside Award Card (Glided up out of the envelope) */}
                      {winner && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 18,
                            left: 24,
                            right: 24,
                            height: 244,
                            background: 'linear-gradient(145deg, #240c35 0%, #11021c 100%)',
                            border: '2.5px solid #FFC857',
                            borderRadius: 16,
                            padding: '16px 20px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            animation: 'letterRise 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                            boxShadow: '0 16px 50px rgba(255,200,87,0.55), 0 0 35px rgba(255,107,53,0.35)',
                            zIndex: 5,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: '#FFC857',
                              letterSpacing: '.14em',
                              textTransform: 'uppercase',
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>🏆</span>
                            <span>OFFICIAL WINNER</span>
                            <span>🏆</span>
                          </div>

                          {winner.photoUrl ? (
                            <img
                              src={winner.photoUrl}
                              alt={winner.name}
                              style={{
                                width: 74,
                                height: 74,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #FFC857',
                                boxShadow: '0 4px 16px rgba(255,200,87,0.5)',
                                marginBottom: 8,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 74,
                                height: 74,
                                borderRadius: '50%',
                                background: 'rgba(255,200,87,0.2)',
                                border: '3px solid #FFC857',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 36,
                                marginBottom: 8,
                              }}
                            >
                              {winner.avatar || '⭐'}
                            </div>
                          )}

                          <div
                            style={{
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: 'clamp(20px, 3vw, 26px)',
                              fontWeight: 800,
                              color: '#fff',
                              textShadow: '0 2px 10px rgba(255,200,87,0.6)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}
                          >
                            {winner.name}
                          </div>

                          {winner.role && (
                            <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 2 }}>{winner.role}</div>
                          )}

                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#86efac',
                              background: 'rgba(34,197,94,0.15)',
                              border: '1px solid rgba(34,197,94,0.3)',
                              padding: '2px 14px',
                              borderRadius: 999,
                            }}
                          >
                            👑 {winner.votesCount} Votes ({winner.percentage}%)
                          </div>
                        </div>
                      )}

                      {/* Envelope Front Pocket (Left, Right, Bottom folds) */}
                      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
                        <svg width="100%" height="100%" viewBox="0 0 480 280" style={{ display: 'block' }}>
                          <defs>
                            <linearGradient id="envGoldLeftOpen" x1="0%" y1="0%" x2="100%" y2="50%">
                              <stop offset="0%" stopColor="#ffd97d" />
                              <stop offset="50%" stopColor="#e5b839" />
                              <stop offset="100%" stopColor="#ba8b1e" />
                            </linearGradient>
                            <linearGradient id="envGoldRightOpen" x1="100%" y1="0%" x2="0%" y2="50%">
                              <stop offset="0%" stopColor="#ffd97d" />
                              <stop offset="50%" stopColor="#e5b839" />
                              <stop offset="100%" stopColor="#ba8b1e" />
                            </linearGradient>
                            <linearGradient id="envGoldBottomOpen" x1="50%" y1="100%" x2="50%" y2="0%">
                              <stop offset="0%" stopColor="#ffe699" />
                              <stop offset="40%" stopColor="#f3c647" />
                              <stop offset="100%" stopColor="#c8961d" />
                            </linearGradient>
                          </defs>
                          <polygon points="0,0 240,140 0,280" fill="url(#envGoldLeftOpen)" opacity="0.95" />
                          <polygon points="480,0 240,140 480,280" fill="url(#envGoldRightOpen)" opacity="0.95" />
                          <polygon points="0,280 240,140 480,280" fill="url(#envGoldBottomOpen)" stroke="#FFE082" strokeWidth="1" />
                        </svg>
                      </div>

                      {/* Top Flap (Flipped backwards - opened!) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: 145,
                          transformOrigin: 'top center',
                          transform: 'rotateX(180deg)',
                          zIndex: 2,
                          filter: 'drop-shadow(0 -4px 10px rgba(0,0,0,0.4))',
                          pointerEvents: 'none',
                        }}
                      >
                        <svg width="100%" height="100%" viewBox="0 0 480 145" style={{ display: 'block' }}>
                          <defs>
                            <linearGradient id="envGoldFlapOpen" x1="50%" y1="0%" x2="50%" y2="100%">
                              <stop offset="0%" stopColor="#fff3b0" />
                              <stop offset="40%" stopColor="#f5c742" />
                              <stop offset="100%" stopColor="#bf8915" />
                            </linearGradient>
                          </defs>
                          <polygon points="0,0 240,140 480,0" fill="url(#envGoldFlapOpen)" stroke="#FFF2B2" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>

                    {/* Grand Winner Trophy Banner */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,200,87,0.25) 0%, rgba(255,107,53,0.15) 100%)',
                        border: '3px solid #FFC857',
                        borderRadius: 26,
                        padding: '32px 24px',
                        textAlign: 'center',
                        marginBottom: 32,
                        boxShadow: '0 20px 60px rgba(255,200,87,0.4)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: -40,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 200,
                          height: 200,
                          background: 'radial-gradient(circle, rgba(255,200,87,0.4) 0%, transparent 70%)',
                          pointerEvents: 'none',
                        }}
                      />

                      <div style={{ fontSize: 48, marginBottom: 6 }}>👑</div>
                      <div
                        style={{
                          display: 'inline-block',
                          background: '#FFC857',
                          color: '#000',
                          padding: '4px 16px',
                          borderRadius: 999,
                          fontFamily: 'Fredoka, sans-serif',
                          fontSize: 14,
                          fontWeight: 900,
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          marginBottom: 14,
                        }}
                      >
                        OFFICIAL WINNER
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {winner.photoUrl ? (
                          <img
                            src={winner.photoUrl}
                            alt={winner.name}
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '4px solid #FFC857',
                              boxShadow: '0 8px 30px rgba(255,200,87,0.6)',
                              marginBottom: 16,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: '50%',
                              background: 'rgba(255,200,87,0.2)',
                              border: '4px solid #FFC857',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 64,
                              marginBottom: 16,
                            }}
                          >
                            {winner.avatar || '⭐'}
                          </div>
                        )}

                        <div
                          style={{
                            fontFamily: 'Fredoka, sans-serif',
                            fontSize: 'clamp(28px, 4vw, 40px)',
                            fontWeight: 800,
                            color: '#fff',
                            textShadow: '0 2px 14px rgba(255,200,87,0.5)',
                          }}
                        >
                          {winner.name}
                        </div>
                        {winner.role && (
                          <div style={{ fontSize: 16, color: '#ffd9b8', marginTop: 4 }}>
                            {winner.role}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 18,
                            padding: '10px 24px',
                            borderRadius: 14,
                            background: 'rgba(0,0,0,0.5)',
                            border: '1.5px solid rgba(255,200,87,0.5)',
                            display: 'flex',
                            gap: 20,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, color: '#FFC857', fontWeight: 700, textTransform: 'uppercase' }}>
                              Winner Ballots
                            </div>
                            <div style={{ fontSize: 24, fontFamily: 'Fredoka, sans-serif', fontWeight: 800 }}>
                              {winner.votesCount} Votes ({winner.percentage}%)
                            </div>
                          </div>
                          {runnerUp && (
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                              <div style={{ fontSize: 11, color: '#86efac', fontWeight: 700, textTransform: 'uppercase' }}>
                                Victory Margin
                              </div>
                              <div style={{ fontSize: 24, fontFamily: 'Fredoka, sans-serif', fontWeight: 800, color: '#86efac' }}>
                                +{leadVotes} Votes
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Complete Vote Transparency Breakdown for ALL nominees */}
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: '#ffd9b8',
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                          marginBottom: 16,
                          textAlign: 'center',
                        }}
                      >
                        Official Transparency Vote Tally ({currentCeremonyCat.totalVotes} Total Ballots)
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: 16,
                        }}
                      >
                        {sorted.map((n, rankIdx) => {
                          const isWin = rankIdx === 0
                          return (
                            <div
                              key={n.id}
                              style={{
                                background: isWin ? 'rgba(255,200,87,0.15)' : 'rgba(255,255,255,0.04)',
                                border: isWin ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 18,
                                padding: 18,
                                boxShadow: isWin ? '0 10px 30px rgba(255,200,87,0.25)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 900,
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    background: isWin ? '#FFC857' : 'rgba(255,255,255,0.1)',
                                    color: isWin ? '#000' : '#fff',
                                  }}
                                >
                                  {isWin ? '👑 1st (WINNER)' : rankIdx === 1 ? '🥈 2nd PLACE' : rankIdx === 2 ? '🥉 3rd PLACE' : `#${rankIdx + 1} PLACE`}
                                </span>
                                <span style={{ fontWeight: 800, fontSize: 18, color: isWin ? '#FFC857' : '#fff' }}>
                                  {n.votesCount} votes
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {n.photoUrl ? (
                                  <img
                                    src={n.photoUrl}
                                    alt={n.name}
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 12,
                                      objectFit: 'cover',
                                      border: isWin ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.2)',
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 12,
                                      background: 'rgba(255,255,255,0.1)',
                                      display: 'grid',
                                      placeItems: 'center',
                                      fontSize: 24,
                                    }}
                                  >
                                    {n.avatar || '⭐'}
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{n.name}</div>
                                  {n.role && <div style={{ fontSize: 12, color: '#ffd9b8' }}>{n.role}</div>}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ marginTop: 14 }}>
                                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${n.percentage}%`,
                                      background: isWin ? 'linear-gradient(90deg, #FFC857, #FFA23A)' : 'linear-gradient(90deg, #a855f7, #6366f1)',
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                  <span>Turnout Share</span>
                                  <span style={{ fontWeight: 700, color: '#fff' }}>{n.percentage}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
