'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { ChoiceAwardsState, AwardCategory, AwardNominee } from '@/lib/choiceAwards'

export default function ChoiceAwardsLiveOscarsPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentCatIndex, setCurrentCatIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Web Audio fanfare / suspense chimes synthesizer
  const playOscarsFanfare = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      // Brass / Fanfare progression: C4, G4, C5, E5
      const notes = [261.63, 392.00, 523.25, 659.25]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15)
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + idx * 0.15 + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.15 + 1.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.15)
        osc.stop(ctx.currentTime + idx * 0.15 + 1.3)
      })
    } catch {}
  }, [])

  // Poll state every 2 seconds so live votes reflect in real-time
  useEffect(() => {
    let active = true

    async function fetchState() {
      try {
        const res = await fetch(`/api/choice-awards?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {
        // network glitch
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // Fire grand Oscars golden confetti
  const fireConfetti = useCallback(() => {
    try {
      const end = Date.now() + 2.5 * 1000
      const colors = ['#FFC857', '#FFA23A', '#e8962a', '#ffffff', '#eab308']

      ;(function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors,
        })
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors,
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      })()

      // Center burst
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      })
    } catch {}
  }, [])

  // Handle Reveal Action
  const handleReveal = useCallback(() => {
    if (isRevealed) return
    setIsRevealed(true)
    playOscarsFanfare()
    fireConfetti()
  }, [isRevealed, playOscarsFanfare, fireConfetti])

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (!data) return
    setIsRevealed(false)
    setCurrentCatIndex(prev => (prev > 0 ? prev - 1 : data.categories.length - 1))
  }, [data])

  const handleNext = useCallback(() => {
    if (!data) return
    setIsRevealed(false)
    setCurrentCatIndex(prev => (prev < data.categories.length - 1 ? prev + 1 : 0))
  }, [data])

  // Keyboard navigation for presenter: Left, Right, Space
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!isRevealed) {
          handleReveal()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, handleReveal, isRevealed])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const categories = data?.categories || []
  const currentCat: AwardCategory | undefined = categories[currentCatIndex]
  const totalCategories = categories.length

  // Find winner(s)
  let maxVotes = -1
  let winners: AwardNominee[] = []
  if (currentCat) {
    for (const nom of currentCat.nominees) {
      if (nom.votesCount > maxVotes && nom.votesCount > 0) {
        maxVotes = nom.votesCount
        winners = [nom]
      } else if (nom.votesCount === maxVotes && maxVotes > 0) {
        winners.push(nom)
      }
    }
  }

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0312', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFC857', fontFamily: 'Fredoka, sans-serif' }}>
        <div style={{ fontSize: 60, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🏆</div>
        <div style={{ fontSize: 24, letterSpacing: '.06em' }}>Preparing the Oscars Stage…</div>
      </div>
    )
  }

  if (!currentCat) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0312', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, marginBottom: 8 }}>No Categories Configured</div>
        <p style={{ color: '#ffd9b8', maxWidth: 400, marginBottom: 20 }}>Please set up award categories in the Admin Dashboard before presenting.</p>
        <Link href="/organizer/choice-awards" style={{ color: '#FFC857', fontWeight: 700, textDecoration: 'none' }}>Go to Admin Setup →</Link>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #1f0b2f 0%, #0c0214 55%, #030005 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Oscars Ambient Lighting & Gold Rays */}
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse at 50% 30%, rgba(255,200,87,0.18), transparent 75%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '15%', width: 2, height: '100vh', background: 'linear-gradient(180deg, rgba(255,200,87,0.2), transparent)', transform: 'rotate(12deg)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: '15%', width: 2, height: '100vh', background: 'linear-gradient(180deg, rgba(255,200,87,0.2), transparent)', transform: 'rotate(-12deg)', pointerEvents: 'none' }} />

      {/* Top Presenter Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,200,87,0.25)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🏆</div>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 800, color: '#FFC857', letterSpacing: '.04em' }}>
              GLOWFIESTA CHOICE AWARDS 2026
            </div>
            <div style={{ fontSize: 11, color: '#c4b5d4' }}>
              OFFICIAL OSCARS REVEAL CEREMONY
            </div>
          </div>
        </div>

        {/* Category Indicator & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handlePrev}
            aria-label="Previous Category"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '6px 14px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Prev
          </button>

          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              color: '#FFC857',
              letterSpacing: '.06em',
            }}
          >
            CATEGORY {currentCatIndex + 1} OF {totalCategories}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next Category"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '6px 14px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Next →
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              background: 'rgba(255,200,87,0.15)',
              border: '1px solid rgba(255,200,87,0.35)',
              borderRadius: 10,
              padding: '6px 12px',
              color: '#FFC857',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 32px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Category Title */}
        <div style={{ marginBottom: 24, maxWidth: 900 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 18px',
              borderRadius: 999,
              background: 'rgba(255,200,87,0.12)',
              border: '1px solid rgba(255,200,87,0.35)',
              color: '#FFC857',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            <span>✨ CATEGORY {currentCatIndex + 1} OF {totalCategories}</span>
          </div>

          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(32px, 5vw, 54px)',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 10px',
              background: 'linear-gradient(135deg, #ffffff 30%, #FFC857 75%, #FF9E2C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(255,200,87,0.35)',
            }}
          >
            {currentCat.title}
          </h1>

          {currentCat.subtitle && (
            <p style={{ color: '#d8c7ed', fontSize: 'clamp(15px, 2vw, 19px)', margin: '0 auto', maxWidth: 700, lineHeight: 1.45 }}>
              {currentCat.subtitle}
            </p>
          )}
        </div>

        {/* PHASE 1: PRE-REVEAL — THE NOMINEES GRID + GOLDEN ENVELOPE */}
        {!isRevealed ? (
          <div style={{ width: '100%', maxWidth: 1000 }}>
            <div style={{ fontSize: 13, color: '#FFC857', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              OFFICIAL NOMINEES
            </div>

            {/* Nominees Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
                gap: 18,
                marginBottom: 36,
              }}
            >
              {currentCat.nominees.map(nom => (
                <div
                  key={nom.id}
                  style={{
                    background: 'linear-gradient(145deg, rgba(28,12,42,0.9), rgba(14,4,22,0.95))',
                    border: '1.5px solid rgba(255,200,87,0.3)',
                    borderRadius: 18,
                    padding: '24px 18px',
                    textAlign: 'center',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                    transition: 'transform .2s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      width: 72,
                      height: 72,
                      borderRadius: 18,
                      background: 'rgba(255,200,87,0.12)',
                      border: '1px solid rgba(255,200,87,0.3)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 14px',
                      boxShadow: '0 0 20px rgba(255,200,87,0.2)',
                    }}
                  >
                    {nom.avatar || '⭐'}
                  </div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                    {nom.name}
                  </div>
                  {nom.role && (
                    <div style={{ fontSize: 13, color: '#a394bb' }}>
                      {nom.role}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* THE GOLDEN OSCAR ENVELOPE UNSEALING BUTTON */}
            <div>
              <button
                onClick={handleReveal}
                style={{
                  position: 'relative',
                  padding: '20px 48px',
                  borderRadius: 24,
                  border: '2px solid #FFC857',
                  background: 'linear-gradient(135deg, #FFC857 0%, #FFA23A 50%, #FF6B35 100%)',
                  color: '#150324',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(20px, 2.5vw, 26px)',
                  letterSpacing: '.04em',
                  cursor: 'pointer',
                  boxShadow: '0 12px 40px rgba(255,162,58,0.65), 0 0 40px rgba(255,200,87,0.4)',
                  transform: 'scale(1)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  animation: 'pulse 1.8s infinite',
                }}
              >
                <span>🏆 UNSEAL THE GOLDEN ENVELOPE</span>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', opacity: 0.85, marginTop: 4, textTransform: 'uppercase' }}>
                  Press Spacebar or Click to Reveal Winner
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* PHASE 2: POST-REVEAL — THE WINNER & FULL TRANSPARENCY BREAKDOWN */
          <div style={{ width: '100%', maxWidth: 1000, animation: 'slideUp .6s cubic-bezier(.2,.8,.2,1)' }}>
            {/* OSCAR WINNER CARD */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FFC857', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 12 }}>
                🌟 AND THE AWARD GOES TO… 🌟
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
                {winners.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 32, color: '#ffd9b8' }}>
                    No votes were recorded in this category yet.
                  </div>
                ) : (
                  winners.map(win => (
                    <div
                      key={win.id}
                      style={{
                        position: 'relative',
                        background: 'linear-gradient(135deg, rgba(45,15,65,0.95) 0%, rgba(20,5,32,0.98) 100%)',
                        border: '3px solid #FFC857',
                        borderRadius: 28,
                        padding: '36px 48px',
                        boxShadow: '0 20px 60px rgba(255,200,87,0.55), inset 0 0 30px rgba(255,200,87,0.2)',
                        textAlign: 'center',
                        maxWidth: 440,
                        width: '100%',
                        boxSizing: 'border-box',
                        animation: 'pop .6s both',
                      }}
                    >
                      {/* Laurel Wreath Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: -16,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'linear-gradient(135deg, #FFC857, #FF6B35)',
                          color: '#140321',
                          fontFamily: 'Fredoka, sans-serif',
                          fontWeight: 900,
                          fontSize: 13,
                          letterSpacing: '.12em',
                          padding: '4px 18px',
                          borderRadius: 999,
                          boxShadow: '0 4px 14px rgba(255,107,53,0.5)',
                        }}
                      >
                        🏆 OSCAR WINNER
                      </div>

                      <div
                        style={{
                          fontSize: 64,
                          width: 96,
                          height: 96,
                          borderRadius: 24,
                          background: 'linear-gradient(135deg, rgba(255,200,87,0.3), rgba(255,107,53,0.3))',
                          border: '2px solid #FFC857',
                          display: 'grid',
                          placeItems: 'center',
                          margin: '12px auto 16px',
                          boxShadow: '0 0 35px rgba(255,200,87,0.5)',
                        }}
                      >
                        {win.avatar || '🏆'}
                      </div>

                      <div
                        style={{
                          fontFamily: 'Fredoka, sans-serif',
                          fontSize: 'clamp(28px, 4vw, 38px)',
                          fontWeight: 900,
                          color: '#FFC857',
                          lineHeight: 1.15,
                          marginBottom: 6,
                          textShadow: '0 2px 10px rgba(255,200,87,0.4)',
                        }}
                      >
                        {win.name}
                      </div>

                      {win.role && (
                        <div style={{ fontSize: 16, color: '#ffd9b8', fontWeight: 600, marginBottom: 12 }}>
                          {win.role}
                        </div>
                      )}

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,200,87,0.18)', border: '1px solid rgba(255,200,87,0.4)', padding: '6px 16px', borderRadius: 999, fontSize: 14, fontWeight: 800, color: '#FFC857' }}>
                        <span>{win.votesCount} {win.votesCount === 1 ? 'Vote' : 'Votes'} ({win.percentage || 0}%)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* FULL TRANSPARENCY BREAKDOWN (ALL NOMINEES) */}
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(20,8,30,0.9), rgba(10,3,16,0.95))',
                border: '1.5px solid rgba(255,200,87,0.35)',
                borderRadius: 22,
                padding: '24px 28px',
                textAlign: 'left',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 800, color: '#FFC857' }}>
                    📊 Transparent Vote Tally
                  </div>
                  <div style={{ fontSize: 12, color: '#a394bb' }}>
                    All nominee voting percentages verified across all cast ballots
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                    {currentCat.totalVotes}
                  </div>
                  <div style={{ fontSize: 11, color: '#a394bb', textTransform: 'uppercase' }}>
                    Total Category Votes
                  </div>
                </div>
              </div>

              {/* Breakdown Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {currentCat.nominees.map(nom => {
                  const isTop = winners.some(w => w.id === nom.id)

                  return (
                    <div key={nom.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{nom.avatar || '⭐'}</span>
                          <span style={{ fontWeight: 700, fontSize: 16, color: isTop ? '#FFC857' : '#fff' }}>
                            {nom.name}
                          </span>
                          {nom.role && (
                            <span style={{ fontSize: 12, color: '#a394bb' }}>
                              ({nom.role})
                            </span>
                          )}
                          {isTop && (
                            <span style={{ fontSize: 11, background: '#FFC857', color: '#150324', padding: '1px 7px', borderRadius: 6, fontWeight: 800 }}>
                              WINNER 🏆
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, color: '#d8c7ed' }}>
                            {nom.votesCount} {nom.votesCount === 1 ? 'vote' : 'votes'}
                          </span>
                          <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 800, fontSize: 17, color: isTop ? '#FFC857' : '#fff', minWidth: 48, textAlign: 'right' }}>
                            {nom.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div style={{ height: 12, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${nom.percentage || 0}%`,
                            background: isTop
                              ? 'linear-gradient(90deg, #FFC857, #FF6B35)'
                              : 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                            borderRadius: 999,
                            transition: 'width 1s cubic-bezier(.2,.8,.2,1)',
                            boxShadow: isTop ? '0 0 16px rgba(255,200,87,0.7)' : 'none',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions: Re-fire Confetti or Next Award */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 28 }}>
              <button
                onClick={fireConfetti}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,200,87,0.3)',
                  borderRadius: 14,
                  padding: '10px 22px',
                  color: '#FFC857',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                🎉 Confetti Burst
              </button>

              <button
                onClick={handleNext}
                style={{
                  background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                  border: 0,
                  borderRadius: 14,
                  padding: '12px 28px',
                  color: '#150324',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(255,200,87,0.4)',
                }}
              >
                Next Award Category →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Presenter Helper Bar */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 28px',
          background: 'rgba(0,0,0,0.45)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
          color: '#8b7fa8',
          zIndex: 50,
        }}
      >
        <div>
          Keyboard Shortcuts: <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>←</kbd> Previous | <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>→</kbd> Next | <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>Space</kbd> Unseal Envelope
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>Audience Vote URL: <b>/vote</b></span>
          <Link href="/organizer/choice-awards" style={{ color: '#FFC857', textDecoration: 'none' }}>
            Admin Setup
          </Link>
        </div>
      </footer>
    </div>
  )
}
