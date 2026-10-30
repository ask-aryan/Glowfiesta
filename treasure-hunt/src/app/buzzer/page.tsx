'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BuzzerLandingPage() {
  const router = useRouter()
  const [hostRoomName, setHostRoomName] = useState('')
  const [creatingHost, setCreatingHost] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joinTeamName, setJoinTeamName] = useState('')
  const [joining, setJoining] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleCreateHost(e: React.FormEvent) {
    e.preventDefault()
    setCreatingHost(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/buzzer/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hostRoomName.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to create room')
      }
      // Save hostKey in localStorage for convenience
      if (typeof window !== 'undefined') {
        localStorage.setItem(`buzzer_host_${data.roomCode}`, data.hostKey)
      }
      router.push(`/buzzer/${data.roomCode}/host?key=${encodeURIComponent(data.hostKey)}`)
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while creating room')
      setCreatingHost(false)
    }
  }

  function handleJoinParticipant(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    const team = joinTeamName.trim()
    if (!code) {
      setErrorMsg('Please enter a Room Code')
      return
    }
    if (!team) {
      setErrorMsg('Please enter your Team Name')
      return
    }
    setJoining(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`buzzer_team_${code}`, team)
    }
    router.push(`/buzzer/${code}`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 25%, #2a0845 0%, #110022 60%, #06000c 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 22,
            fontWeight: 800,
            textDecoration: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 26 }}>⚡</span>
          <span>
            Glow<span style={{ color: '#FF9E2C' }}>Fiesta</span> Buzzer
          </span>
        </Link>
        <div style={{ fontSize: 13, color: '#ffd9b8', fontWeight: 600 }}>
          No Login Required
        </div>
      </header>

      {/* Hero Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 20px',
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,158,44,0.15)',
              border: '1px solid rgba(255,158,44,0.4)',
              color: '#FFB854',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            <span>🚨 Real-Time Millisecond Precision</span>
          </div>
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 12px',
              background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 80%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Live Game Show Buzzer
          </h1>
          <p style={{ color: '#c4b5d4', fontSize: 16, maxWidth: 540, margin: '0 auto' }}>
            Instant setup. Host creates a room, players join with their phone, and whoever slams the big buzzer first wins the question!
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.18)',
              border: '1.5px solid rgba(239,68,68,0.5)',
              color: '#fca5a5',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Two Choice Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            width: '100%',
          }}
        >
          {/* Host Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1.5px solid rgba(255,158,44,0.3)',
              borderRadius: 24,
              padding: '30px 26px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 120,
                height: 120,
                background: 'radial-gradient(circle, rgba(255,158,44,0.2), transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  boxShadow: '0 6px 16px rgba(255,107,53,0.35)',
                }}
              >
                👑
              </div>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
                  Host a Game
                </h2>
                <div style={{ fontSize: 13, color: '#ffd9b8' }}>Run the trivia & control rounds</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#a89bc2', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              Get a unique room link and host controls with <b>DRAFT</b>, <b>READY</b>, and <b>LIVE</b> stages, live millisecond rank list, and instant buzzer reset.
            </p>

            <form onSubmit={handleCreateHost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#e5d9f2', marginBottom: 6 }}>
                  ROOM TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Quiz Finals"
                  value={hostRoomName}
                  onChange={e => setHostRoomName(e.target.value)}
                  maxLength={60}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={creatingHost}
                style={{
                  height: 50,
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: creatingHost ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {creatingHost ? 'CREATING ROOM…' : 'CREATE HOST ROOM 🚀'}
              </button>
            </form>
          </div>

          {/* Participant Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1.5px solid rgba(239,68,68,0.3)',
              borderRadius: 24,
              padding: '30px 26px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 120,
                height: 120,
                background: 'radial-gradient(circle, rgba(239,68,68,0.2), transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  boxShadow: '0 6px 16px rgba(239,68,68,0.35)',
                }}
              >
                🚨
              </div>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
                  Join as Participant
                </h2>
                <div style={{ fontSize: 13, color: '#ffd9b8' }}>Slam the big buzzer first</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#a89bc2', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              Enter the room code given by the host, put in your team name, and hold your finger ready over the giant buzzer!
            </p>

            <form onSubmit={handleJoinParticipant} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#e5d9f2', marginBottom: 6 }}>
                  ROOM CODE
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8K2M9P"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#FFC857',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#e5d9f2', marginBottom: 6 }}>
                  TEAM / PLAYER NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lightning Tigers"
                  value={joinTeamName}
                  onChange={e => setJoinTeamName(e.target.value)}
                  maxLength={40}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={joining}
                style={{
                  height: 50,
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: joining ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                ENTER ARENA 🚨
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
