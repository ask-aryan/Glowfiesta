'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { startNav } from '@/components/NavigationLoader'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? ''
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [kb, setKb] = useState(false)

  // Modals for Join & Host Party
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)
  const [partyCode, setPartyCode] = useState('')
  const [partyTeam, setPartyTeam] = useState('')
  const [hostTitle, setHostTitle] = useState('')
  const [partyActionLoading, setPartyActionLoading] = useState(false)
  const [partyModalError, setPartyModalError] = useState('')

  function handleJoinPartySubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = partyCode.trim().toUpperCase()
    const team = partyTeam.trim()
    if (!code) {
      setPartyModalError('Please enter a party code')
      return
    }
    if (!team) {
      setPartyModalError('Please enter your team name')
      return
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`buzzer_team_${code}`, team)
    }
    router.push(`/buzzer/${code}`)
  }

  async function handleHostPartySubmit(e: React.FormEvent) {
    e.preventDefault()
    setPartyActionLoading(true)
    setPartyModalError('')
    try {
      const res = await fetch('/api/buzzer/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hostTitle.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to create party')
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`buzzer_host_${data.roomCode}`, data.hostKey)
      }
      router.push(`/buzzer/${data.roomCode}/host?key=${encodeURIComponent(data.hostKey)}`)
    } catch (err: any) {
      setPartyModalError(err.message || 'Failed to create party')
      setPartyActionLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      return
    }
    startNav()
    if (redirectTo) router.push(redirectTo)
    else if (data.role === 'ORGANIZER') router.push('/organizer')
    else router.push('/player')
  }

  return (
    <div
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #1a0533 0%, #3d1a00 50%, #FF6B35 150%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
      }}
    >
      {/* Top Right Party Actions */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 40,
        }}
      >
        <button
          onClick={() => {
            setPartyModalError('')
            setShowJoinModal(true)
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: 'rgba(239,68,68,0.22)',
            border: '1.5px solid rgba(239,68,68,0.5)',
            color: '#fca5a5',
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            transition: 'all .15s ease',
          }}
        >
          <span>🎮</span>
          <span>Join a Party</span>
        </button>

        <button
          onClick={() => {
            setPartyModalError('')
            setShowHostModal(true)
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: 'rgba(255,158,44,0.22)',
            border: '1.5px solid rgba(255,158,44,0.5)',
            color: '#FFB854',
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            transition: 'all .15s ease',
          }}
        >
          <span>👑</span>
          <span>Host a Party</span>
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'transform .3s ease',
          transform: kb ? 'translateY(-40px)' : 'translateY(0)',
          width: '100%',
          maxWidth: 360,
          boxSizing: 'border-box',
        }}
      >
        {/* Animated Diya */}
        <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 2 }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 4,
              width: 104,
              height: 104,
              background: 'radial-gradient(circle, rgba(255,170,60,.55), rgba(255,107,53,0) 65%)',
              transform: 'translateX(-50%)',
              animation: 'halo-anim 2s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 10,
              width: 24,
              height: 46,
              borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%',
              background:
                'radial-gradient(ellipse at 50% 75%, #fff6c8 0, #FFC857 35%, #FF6B35 75%, rgba(255,60,0,0) 100%)',
              transformOrigin: '50% 100%',
              animation: 'flick 1.1s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 16,
              width: 70,
              height: 30,
              marginLeft: -35,
              borderRadius: '0 0 70px 70px',
              background: 'linear-gradient(180deg, #e0832f, #8a3d10)',
              boxShadow: '0 4px 14px rgba(0,0,0,.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 40,
              width: 76,
              height: 8,
              marginLeft: -38,
              borderRadius: '50%',
              background: '#ffb25e',
            }}
          />
        </div>

        {/* Heading */}
        <div
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 6vw, 34px)',
            lineHeight: 1.05,
            background: 'linear-gradient(180deg, #fff0b3, #FFC857 55%, #e8962a)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textAlign: 'center',
            filter: 'drop-shadow(0 2px 10px rgba(255,170,60,.4))',
          }}
        >
          GlowFiesta 2026
        </div>
        <div
          style={{
            letterSpacing: '.35em',
            fontSize: 11,
            color: '#ffd9b8',
            margin: '4px 0 16px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Treasure Hunt
        </div>

        {/* Form Card */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '18px 20px',
            borderRadius: 20,
            background: 'rgba(255,255,255,.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,.16)',
            boxShadow: '0 16px 40px rgba(0,0,0,.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,.18)',
                border: '1px solid rgba(239,68,68,.35)',
                color: '#fca5a5',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <div style={{ fontSize: 11.5, color: '#ffd9b8', marginBottom: 5, fontWeight: 600 }}>
              Team username
            </div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setKb(true)}
              onBlur={() => setKb(false)}
              placeholder="TEAM123"
              autoComplete="username"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(10,4,20,.45)',
                color: '#fff',
                fontSize: 15,
                padding: '0 12px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: '#ffd9b8', marginBottom: 5, fontWeight: 600 }}>
              Password
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setKb(true)}
                onBlur={() => setKb(false)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.15)',
                  background: 'rgba(10,4,20,.45)',
                  color: '#fff',
                  fontSize: 15,
                  padding: '0 40px 0 12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 0,
                  color: showPassword ? '#FFC857' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'color .15s ease',
                }}
              >
                {showPassword ? (
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            style={{
              width: '100%',
              height: 46,
              marginTop: 4,
              border: 0,
              borderRadius: 12,
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: '.04em',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
              boxShadow: '0 4px 16px rgba(255,107,53,.4)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Enter the Hunt'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <a
              href="/buzzer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,200,87,0.3)',
                color: '#FFC857',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all .15s ease',
              }}
            >
              <span>⚡</span>
              <span>Live Game Buzzer (No Login)</span>
            </a>
          </div>
        </div>
      </div>

      {/* JOIN PARTY MODAL */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,1,10,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
            animation: 'pop .2s ease-out',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowJoinModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'linear-gradient(145deg, #240a38 0%, #110220 100%)',
              border: '1.5px solid rgba(239,68,68,0.4)',
              borderRadius: 24,
              padding: '28px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>🎮</span>
                <div>
                  <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, margin: 0 }}>
                    Join a Party
                  </h3>
                  <div style={{ fontSize: 12, color: '#ffd9b8' }}>Slam the buzzer with your team</div>
                </div>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {partyModalError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                {partyModalError}
              </div>
            )}

            <form onSubmit={handleJoinPartySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                  PARTY / ROOM CODE
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8K2M9P"
                  value={partyCode}
                  onChange={e => setPartyCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#FFC857',
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

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                  TEAM / PLAYER NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thunderbolts"
                  value={partyTeam}
                  onChange={e => setPartyTeam(e.target.value)}
                  maxLength={40}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#ccc',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    height: 46,
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(239,68,68,0.4)',
                  }}
                >
                  Join Party 🚨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOST PARTY MODAL */}
      {showHostModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,1,10,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
            animation: 'pop .2s ease-out',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowHostModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'linear-gradient(145deg, #240a38 0%, #110220 100%)',
              border: '1.5px solid rgba(255,158,44,0.4)',
              borderRadius: 24,
              padding: '28px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>👑</span>
                <div>
                  <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, margin: 0 }}>
                    Host a Party
                  </h3>
                  <div style={{ fontSize: 12, color: '#ffd9b8' }}>Create your live trivia room</div>
                </div>
              </div>
              <button
                onClick={() => setShowHostModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {partyModalError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
                {partyModalError}
              </div>
            )}

            <form onSubmit={handleHostPartySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 6 }}>
                  PARTY TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Quiz Finals"
                  value={hostTitle}
                  onChange={e => setHostTitle(e.target.value)}
                  maxLength={60}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#ccc',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={partyActionLoading}
                  style={{
                    flex: 2,
                    height: 46,
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                    color: '#fff',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: partyActionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 20px rgba(255,107,53,0.4)',
                  }}
                >
                  {partyActionLoading ? 'Creating…' : 'Create Party 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100dvh',
            background: 'linear-gradient(135deg, #1a0533 0%, #3d1a00 50%, #FF6B35 150%)',
          }}
        />
      }
    >
      <LoginForm />
    </Suspense>
  )
}
