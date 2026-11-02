'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PollStatus } from '@/lib/poll'

interface OptionData {
  id: string
  text: string
  description?: string
  imageUrl?: string
  votesCount: number
  percentage: number
}

interface QuestionData {
  id: string
  title: string
  subtitle?: string
  options: OptionData[]
  totalVotes: number
  winnerOptionId?: string | null
}

interface PollRoomData {
  roomCode: string
  title: string
  status: PollStatus
  activeQuestionIndex: number
  totalQuestions: number
  activeQuestion: QuestionData | null
}

export default function BigScreenLivePollPage() {
  const params = useParams()
  const roomCode = String(params.pollCode || '').toUpperCase()

  const [room, setRoom] = useState<PollRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Generate QR Code for live audience voting
  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) return
    const shareUrl = `${window.location.origin}/poll/${roomCode}`
    import('qrcode')
      .then(QRCode => {
        QRCode.toDataURL(shareUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).then(setQrDataUrl).catch(() => {})
      })
      .catch(() => {})
  }, [roomCode])

  // Poll room every 400ms
  useEffect(() => {
    if (!roomCode) return
    let active = true

    async function fetchLive() {
      try {
        const res = await fetch(`/api/poll/${roomCode}?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data: PollRoomData = await res.json()
        if (active) {
          setRoom(data)
          setLoading(false)
        }
      } catch {}
    }

    fetchLive()
    const interval = setInterval(fetchLive, 400)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [roomCode])

  function toggleFullscreen() {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  if (loading && !room) {
    return (
      <div style={{ minHeight: '100vh', background: '#070010', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', border: '4px solid rgba(255,200,87,0.3)', borderTopColor: '#FFC857', animation: 'spin 0.75s linear infinite' }} />
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, marginTop: 16 }}>Loading Big Screen Projector…</div>
      </div>
    )
  }

  const stage = room?.status || 'DRAFT'
  const activeQ = room?.activeQuestion
  const isLive = stage === 'LIVE'
  const isReady = stage === 'READY'
  const isDraft = stage === 'DRAFT'
  const isCompleted = stage === 'COMPLETED'

  // Sort options by vote count if in LIVE or COMPLETED
  const displayOptions = [...(activeQ?.options || [])]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 10%, #2e0854 0%, #0d011c 50%, #030008 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background Ambient Glows */}
      <div style={{ position: 'absolute', top: -100, left: '20%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.12), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, right: '15%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.14), transparent 70%)', pointerEvents: 'none' }} />

      {/* Presentation Top Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 36px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1.5px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
              boxShadow: '0 4px 16px rgba(255,200,87,0.4)',
            }}
          >
            🏆
          </div>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '.02em', background: 'linear-gradient(135deg, #fff 40%, #FFC857 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {room?.title}
            </div>
            <div style={{ fontSize: 13, color: '#ffd9b8', fontWeight: 600 }}>
              LIVE AUDIENCE POLL • ROOM CODE: <b style={{ color: '#FFC857', letterSpacing: '.08em' }}>{roomCode}</b>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Stage Badge */}
          <div
            style={{
              padding: '8px 22px',
              borderRadius: 999,
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              background: isLive
                ? 'rgba(34,197,94,0.2)'
                : isReady
                ? 'rgba(234,179,8,0.2)'
                : isCompleted
                ? 'linear-gradient(135deg, rgba(255,200,87,0.3), rgba(255,107,53,0.3))'
                : 'rgba(255,255,255,0.1)',
              border: `2px solid ${
                isLive
                  ? '#22c55e'
                  : isReady
                  ? '#eab308'
                  : isCompleted
                  ? '#FFC857'
                  : 'rgba(255,255,255,0.25)'
              }`,
              color: isLive ? '#4ade80' : isReady ? '#fde047' : isCompleted ? '#FFC857' : '#cbd5e1',
              boxShadow: isLive ? '0 0 24px rgba(34,197,94,0.5)' : isCompleted ? '0 0 28px rgba(255,200,87,0.5)' : 'none',
              animation: isLive ? 'pulse 1.4s infinite' : 'none',
            }}
          >
            {isLive ? '● VOTING LIVE' : isReady ? '● CATEGORY SHOWCASE' : isCompleted ? '🏆 WINNER REVEALED' : '● DRAFT'}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 12,
              padding: '8px 14px',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⛶</span>
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 32,
          padding: '32px 36px',
          maxWidth: 1480,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          alignItems: 'start',
          zIndex: 1,
        }}
      >
        {/* Left: Award Show Category & Nominees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Category Banner */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '2px solid rgba(255,200,87,0.35)',
              borderRadius: 26,
              padding: '26px 32px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.12em', color: '#ffd9b8', textTransform: 'uppercase' }}>
                AWARD CATEGORY #{room ? room.activeQuestionIndex + 1 : 1}
              </div>
              <div
                style={{
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#4ade80',
                  background: 'rgba(34,197,94,0.18)',
                  padding: '4px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(34,197,94,0.4)',
                }}
              >
                Total Votes: {activeQ?.totalVotes || 0}
              </div>
            </div>

            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 'clamp(30px, 4vw, 44px)',
                fontWeight: 800,
                margin: '4px 0',
                background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 85%, #FFA23A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.15,
              }}
            >
              {activeQ?.title}
            </h1>
            {activeQ?.subtitle && (
              <div style={{ fontSize: 18, color: '#c4b5d4', marginTop: 4 }}>
                {activeQ.subtitle}
              </div>
            )}
          </div>

          {/* Nominees Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: displayOptions.length > 3 ? '1fr 1fr' : '1fr',
              gap: 16,
            }}
          >
            {displayOptions.map((opt, idx) => {
              const isWinner = activeQ?.winnerOptionId === opt.id
              return (
                <div
                  key={opt.id}
                  style={{
                    position: 'relative',
                    padding: '22px 26px',
                    borderRadius: 22,
                    background: isWinner
                      ? 'linear-gradient(135deg, rgba(255,200,87,0.25) 0%, rgba(255,107,53,0.2) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: isWinner ? '3px solid #FFC857' : '1.5px solid rgba(255,255,255,0.09)',
                    boxShadow: isWinner ? '0 0 35px rgba(255,200,87,0.4)' : '0 6px 20px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    transition: 'all .3s ease',
                  }}
                >
                  {/* Dynamic Progress Fill Bar */}
                  {(isLive || isCompleted) && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${opt.percentage}%`,
                        background: isWinner
                          ? 'linear-gradient(90deg, rgba(255,200,87,0.25), rgba(255,107,53,0.25))'
                          : 'linear-gradient(90deg, rgba(168,85,247,0.2), rgba(126,34,206,0.2))',
                        zIndex: 0,
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  )}

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 16,
                          background: isWinner
                            ? 'linear-gradient(135deg, #FFC857, #FFA23A)'
                            : 'rgba(255,255,255,0.08)',
                          color: isWinner ? '#000' : '#fff',
                          fontFamily: 'Fredoka, sans-serif',
                          fontSize: 22,
                          fontWeight: 800,
                          display: 'grid',
                          placeItems: 'center',
                          boxShadow: isWinner ? '0 6px 18px rgba(255,200,87,0.5)' : 'none',
                        }}
                      >
                        {isWinner ? '🏆' : `#${idx + 1}`}
                      </div>

                      <div>
                        <div
                          style={{
                            fontFamily: 'Fredoka, sans-serif',
                            fontSize: 24,
                            fontWeight: 800,
                            color: isWinner ? '#FFC857' : '#fff',
                          }}
                        >
                          {opt.text}
                        </div>
                        {opt.description && (
                          <div style={{ fontSize: 14, color: '#c4b5d4', marginTop: 2 }}>
                            {opt.description}
                          </div>
                        )}
                        {isWinner && (
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#FFC857', marginTop: 4, letterSpacing: '.04em' }}>
                            🌟 OFFICIAL WINNER OF THE CATEGORY!
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'Fredoka, monospace',
                          fontSize: 34,
                          fontWeight: 800,
                          color: isWinner ? '#FFC857' : '#d8b4fe',
                          letterSpacing: '.04em',
                        }}
                      >
                        {opt.percentage}%
                      </div>
                      <div style={{ fontSize: 14, color: '#ffd9b8', fontWeight: 600 }}>
                        {opt.votesCount} {opt.votesCount === 1 ? 'vote' : 'votes'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Sidebar: Huge Audience Scan QR Code */}
        <aside
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            border: '2px solid rgba(255,200,87,0.35)',
            borderRadius: 26,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 4 }}>📱</div>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, color: '#FFC857', margin: '0 0 4px' }}>
            Scan to Vote!
          </div>
          <div style={{ fontSize: 13, color: '#ffd9b8', marginBottom: 20 }}>
            Use your phone camera to cast your vote
          </div>

          {/* QR Code Container */}
          {qrDataUrl && (
            <div
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 20,
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                marginBottom: 20,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Scan to Vote"
                style={{ width: 220, height: 220, display: 'block', borderRadius: 10 }}
              />
            </div>
          )}

          {/* Room Code Display */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,200,87,0.3)',
              borderRadius: 14,
              padding: '12px 20px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.08em' }}>
              POLL ROOM CODE
            </div>
            <div
              style={{
                fontFamily: 'Fredoka, monospace',
                fontSize: 28,
                fontWeight: 800,
                color: '#FFC857',
                letterSpacing: '.12em',
                marginTop: 2,
              }}
            >
              {roomCode}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#8b7fa8', marginTop: 14 }}>
            Vote anonymously or enter your name
          </div>
        </aside>
      </main>
    </div>
  )
}
