'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { startNav } from '@/components/NavigationLoader'

interface ActiveSessionData {
  userId?: number
  username: string
  role: 'ORGANIZER' | 'TEAM'
  teamId?: number
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? ''
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Active session detection (cleans up login caching confusion)
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null)
  const [sessionChecking, setSessionChecking] = useState(true)

  /* Commented out party state as requested
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)
  const [partyCode, setPartyCode] = useState('')
  const [partyTeam, setPartyTeam] = useState('')
  const [hostTitle, setHostTitle] = useState('')
  const [partyActionLoading, setPartyActionLoading] = useState(false)
  const [partyModalError, setPartyModalError] = useState('')
  */

  useEffect(() => {
    let isCancelled = false
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!isCancelled && data.userId && data.username) {
            // If user is already authenticated as TEAM and arrived via clue scan redirect, auto-forward
            if (redirectTo) {
              if (data.role === 'TEAM' && !redirectTo.startsWith('/organizer')) {
                startNav()
                router.replace(redirectTo)
                return
              }
              if (data.role === 'ORGANIZER' && !redirectTo.startsWith('/player')) {
                startNav()
                router.replace(redirectTo)
                return
              }
            }
            setActiveSession({
              userId: data.userId,
              username: data.username,
              role: data.role,
              teamId: data.teamId,
            })
          }
        }
      } catch {
        // Not authenticated
      } finally {
        if (!isCancelled) setSessionChecking(false)
      }
    }
    checkSession()
    return () => {
      isCancelled = true
    }
  }, [redirectTo, router])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
      setActiveSession(null)
      setError('')
    } catch {
      setActiveSession(null)
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
        minHeight: '100dvh',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 40px',
        background: 'linear-gradient(135deg, #1a0533 0%, #3d1a00 50%, #FF6B35 150%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* 
        Commented out Top Navigation Bar (Join/Host Party, Choice Awards, Artverse)
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setShowJoinModal(true)}>🎮 Join Party</button>
          <button onClick={() => setShowHostModal(true)}>👑 Host Party</button>
          <a href="/vote">🗳️ Choice Awards</a>
          <a href="/artverse">🎨 Artverse</a>
        </div>
      */}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 380,
          boxSizing: 'border-box',
        }}
      >
        {/* Animated Diya */}
        <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 2 }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 2,
              width: 96,
              height: 96,
              background: 'radial-gradient(circle, rgba(255,170,60,.55), rgba(255,107,53,0) 65%)',
              transform: 'translateX(-50%)',
              animation: 'halo-anim 2s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 8,
              width: 22,
              height: 42,
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
              bottom: 14,
              width: 66,
              height: 28,
              marginLeft: -33,
              borderRadius: '0 0 66px 66px',
              background: 'linear-gradient(180deg, #e0832f, #8a3d10)',
              boxShadow: '0 4px 14px rgba(0,0,0,.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 38,
              width: 72,
              height: 8,
              marginLeft: -36,
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
            lineHeight: 1.1,
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
            letterSpacing: '.32em',
            fontSize: 11,
            color: '#ffd9b8',
            margin: '4px 0 16px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Treasure Hunt
        </div>

        {/* Active Session Card (Prevents Login Cache Confusion) */}
        {activeSession && (
          <div
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 16,
              background: 'rgba(34, 197, 94, 0.14)',
              border: '1.5px solid rgba(74, 222, 128, 0.35)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: 'pop .2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#86efac' }}>
                <span style={{ fontSize: 14 }}>🟢</span>
                <span>Active Session Detected</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'rgba(34,197,94,0.25)',
                  color: '#bbf7d0',
                  padding: '2px 8px',
                  borderRadius: 999,
                  letterSpacing: '.05em',
                }}
              >
                {activeSession.role}
              </span>
            </div>

            <div style={{ fontSize: 13.5, color: '#f0fdf4' }}>
              You are currently signed in as <b>{activeSession.username}</b>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                type="button"
                onClick={() => {
                  startNav()
                  if (redirectTo) router.push(redirectTo)
                  else if (activeSession.role === 'ORGANIZER') router.push('/organizer')
                  else router.push('/player')
                }}
                style={{
                  flex: 2,
                  height: 38,
                  borderRadius: 10,
                  border: 0,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                }}
              >
                Continue as {activeSession.username} →
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fecaca',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Switch Account
              </button>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '22px 20px',
            borderRadius: 22,
            background: 'rgba(255,255,255,.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,.16)',
            boxShadow: '0 16px 40px rgba(0,0,0,.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 13,
          }}
        >
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,.18)',
                border: '1px solid rgba(239,68,68,.35)',
                color: '#fca5a5',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 5, fontWeight: 600 }}>
              Team username
            </div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="TEAM123"
              autoComplete="username"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 46,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,.18)',
                background: 'rgba(10,4,20,.5)',
                color: '#fff',
                fontSize: 16, // 16px prevents iOS zoom
                padding: '0 14px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 5, fontWeight: 600 }}>
              Password
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 46,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.18)',
                  background: 'rgba(10,4,20,.5)',
                  color: '#fff',
                  fontSize: 16, // 16px prevents iOS zoom
                  padding: '0 42px 0 14px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 0,
                  color: showPassword ? '#FFC857' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
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
              height: 48,
              marginTop: 6,
              border: 0,
              borderRadius: 14,
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '.04em',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
              boxShadow: '0 4px 16px rgba(255,107,53,.4)',
              opacity: loading ? 0.7 : 1,
              transition: 'transform .15s ease',
            }}
          >
            {loading ? 'Signing in…' : 'Enter the Hunt'}
          </button>

          {/* 
            Commented out bottom quick links (Game Buzzer, Choice Awards, Artverse)
            <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <a href="/buzzer">⚡ Game Buzzer</a>
              <a href="/vote">🗳️ Choice Awards</a>
              <a href="/artverse">🎨 Artverse</a>
            </div>
          */}
        </div>
      </div>

      {/* 
        Commented out JOIN PARTY MODAL & HOST PARTY MODAL
      */}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            background: 'linear-gradient(135deg, #1a0533 0%, #3d1a00 50%, #FF6B35 150%)',
          }}
        />
      }
    >
      <LoginForm />
    </Suspense>
  )
}
