'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PollLandingPage() {
  const router = useRouter()
  const [pollTitle, setPollTitle] = useState('')
  const [creatingHost, setCreatingHost] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault()
    setCreatingHost(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/poll/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pollTitle.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to create poll')
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`poll_host_${data.roomCode}`, data.hostKey)
      }
      router.push(`/poll/${data.roomCode}/admin?key=${encodeURIComponent(data.hostKey)}`)
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while creating poll')
      setCreatingHost(false)
    }
  }

  function handleJoinPoll(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setErrorMsg('Please enter a Poll Code')
      return
    }
    setJoining(true)
    router.push(`/poll/${code}`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #20083b 0%, #0c0117 60%, #040008 100%)',
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
          <span style={{ fontSize: 26 }}>📊</span>
          <span>
            Glow<span style={{ color: '#FFC857' }}>Fiesta</span> Live Polls
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/buzzer"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#f87171',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '6px 14px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            ⚡ Game Buzzer
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#ffd9b8',
              textDecoration: 'none',
            }}
          >
            Treasure Hunt Login →
          </Link>
        </div>
      </header>

      {/* Hero */}
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
              padding: '6px 18px',
              borderRadius: 999,
              background: 'rgba(255,200,87,0.15)',
              border: '1px solid rgba(255,200,87,0.4)',
              color: '#FFC857',
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            <span>🏆 Award Shows • Live Audience Voting • Stage Projector</span>
          </div>
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 12px',
              background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 75%, #FFA23A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Live Polls & Award Shows
          </h1>
          <p style={{ color: '#c4b5d4', fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
            Set up questions, display award nominees on the big screen, and let the audience scan to vote anonymously or with their name in real time!
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

        {/* Two Action Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            width: '100%',
          }}
        >
          {/* Admin Host Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1.5px solid rgba(255,200,87,0.35)',
              borderRadius: 24,
              padding: '30px 26px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  boxShadow: '0 6px 16px rgba(255,200,87,0.35)',
                }}
              >
                👑
              </div>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
                  Host / Poll Admin
                </h2>
                <div style={{ fontSize: 13, color: '#ffd9b8' }}>Create questions & nominees</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#a89bc2', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              Full admin controls with <b>DRAFT</b>, <b>READY</b>, and <b>LIVE</b> stages. Customize nominees, manage categories, and launch the cinema projector view.
            </p>

            <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                  POLL / EVENT TITLE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Diwali Awards 2026"
                  value={pollTitle}
                  onChange={e => setPollTitle(e.target.value)}
                  maxLength={70}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.18)',
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
                  background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                  color: '#000',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 17,
                  fontWeight: 800,
                  cursor: creatingHost ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(255,200,87,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {creatingHost ? 'CREATING POLL…' : 'CREATE POLL ADMIN 🚀'}
              </button>
            </form>
          </div>

          {/* Audience Join Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1.5px solid rgba(147,51,234,0.35)',
              borderRadius: 24,
              padding: '30px 26px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  boxShadow: '0 6px 16px rgba(168,85,247,0.35)',
                }}
              >
                🗳️
              </div>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
                  Audience Voting
                </h2>
                <div style={{ fontSize: 13, color: '#ffd9b8' }}>Vote on live categories</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#a89bc2', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
              Enter the poll code shown on the screen or scan the QR code. You can choose to vote anonymously or with your name.
            </p>

            <form onSubmit={handleJoinPoll} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                  POLL CODE
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7X9K2M"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#c084fc',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textTransform: 'uppercase',
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
                  background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: joining ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                JOIN POLL 🗳️
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
