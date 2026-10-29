'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? ''
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [kb, setKb] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Login failed'); return }
    if (redirectTo) router.push(redirectTo)
    else if (data.role === 'ORGANIZER') router.push('/organizer')
    else router.push('/player')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transition: 'transform .35s ease',
        transform: kb ? 'translateY(-80px)' : 'translateY(0)',
        width: '100%', maxWidth: 380,
      }}>
        {/* Diya */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 6 }}>
          <div style={{ position: 'absolute', left: '50%', top: 6, width: 130, height: 130, background: 'radial-gradient(circle,rgba(255,170,60,.55),rgba(255,107,53,0) 65%)', transform: 'translateX(-50%)', animation: 'halo-anim 2s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: '50%', top: 14, width: 30, height: 56, borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%', background: 'radial-gradient(ellipse at 50% 75%,#fff6c8 0,#FFC857 35%,#FF6B35 75%,rgba(255,60,0,0) 100%)', transformOrigin: '50% 100%', animation: 'flick 1.1s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: '50%', bottom: 22, width: 84, height: 36, marginLeft: -42, borderRadius: '0 0 84px 84px', background: 'linear-gradient(180deg,#e0832f,#8a3d10)', boxShadow: '0 6px 18px rgba(0,0,0,.4)' }} />
          <div style={{ position: 'absolute', left: '50%', bottom: 50, width: 90, height: 10, marginLeft: -45, borderRadius: '50%', background: '#ffb25e' }} />
        </div>

        <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 38, lineHeight: 1.05, background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textAlign: 'center', filter: 'drop-shadow(0 2px 12px rgba(255,170,60,.45))' }}>
          GlowFiesta 2026
        </div>
        <div style={{ letterSpacing: '.4em', fontSize: 12, color: '#ffd9b8', margin: '8px 0 26px', textTransform: 'uppercase' }}>
          Treasure Hunt
        </div>

        <div style={{
          width: '100%', boxSizing: 'border-box', padding: 22, borderRadius: 24,
          background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 20px 50px rgba(0,0,0,.35)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 6, fontWeight: 500 }}>Team username</div>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              onFocus={() => setKb(true)} onBlur={() => setKb(false)}
              placeholder="TEAM123" autoComplete="username"
              style={{ width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(10,4,20,.45)', color: '#fff', fontSize: 16, padding: '0 14px', outline: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 6, fontWeight: 500 }}>Password</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onFocus={() => setKb(true)} onBlur={() => setKb(false)}
              placeholder="••••••••" autoComplete="current-password"
              style={{ width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(10,4,20,.45)', color: '#fff', fontSize: 16, padding: '0 14px', outline: 'none' }}
            />
          </div>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            style={{
              width: '100%', height: 50, marginTop: 4, border: 0, borderRadius: 14,
              fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, letterSpacing: '.04em',
              color: '#fff', cursor: 'pointer',
              background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)',
              boxShadow: '0 6px 20px rgba(255,107,53,.4)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Enter the Hunt'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)' }} />}>
      <LoginForm />
    </Suspense>
  )
}
