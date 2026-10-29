'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ScanTokenPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [result, setResult] = useState<{ success: boolean; message: string; resultCode?: string; displayNumber?: number; final?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    async function submitScan() {
      const meRes = await fetch('/api/auth/me')
      if (!meRes.ok) { router.push(`/login?redirect=/scan/${params.token}`); return }
      const meData = await meRes.json()
      if (meData.role !== 'TEAM') { setAuthError(true); setLoading(false); return }
      const res = await fetch('/api/player/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token }) })
      const data = await res.json()
      setResult(data); setLoading(false)
    }
    submitScan()
  }, [params.token, router])

  const bg = 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{ position: 'absolute', left: '50%', top: 4, width: 90, height: 90, background: 'radial-gradient(circle,rgba(255,170,60,.55),rgba(255,107,53,0) 65%)', transform: 'translateX(-50%)', animation: 'halo-anim 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: 10, width: 20, height: 38, borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%', background: 'radial-gradient(ellipse at 50% 75%,#fff6c8 0,#FFC857 35%,#FF6B35 75%,rgba(255,60,0,0) 100%)', transformOrigin: '50% 100%', animation: 'flick .9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 14, width: 56, height: 24, marginLeft: -28, borderRadius: '0 0 56px 56px', background: 'linear-gradient(180deg,#e0832f,#8a3d10)' }} />
      </div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Checking your QR code…</div>
    </div>
  )

  if (authError) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, marginBottom: 8 }}>Not a player account</div>
      <div style={{ color: '#ffd9b8', marginBottom: 24 }}>Only team players can scan QR codes.</div>
      <Link href="/login" style={{ background: 'linear-gradient(135deg,#FFA23A,#FF6B35)', color: '#fff', padding: '12px 24px', borderRadius: 14, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, textDecoration: 'none' }}>Go to Login</Link>
    </div>
  )

  if (!result) return null

  if (result.final) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#1a0533,#4a1a00 70%,#FF6B35 160%)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', animation: 'slideUp .45s ease', position: 'relative', color: '#fff' }}>
      <div style={{ position: 'absolute', left: '25%', top: '30%', width: 280, height: 280, borderRadius: '50%', border: '4px solid #FFC857', animation: 'burst 1.8s ease-out infinite' }} />
      <div style={{ position: 'absolute', left: '75%', top: '22%', width: 240, height: 240, borderRadius: '50%', border: '4px solid #ff6b9a', animation: 'burst 1.8s .6s ease-out infinite' }} />
      <div style={{ position: 'relative', fontSize: 84, animation: 'pop .7s both' }}>🏆</div>
      <div style={{ position: 'relative', fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28, color: '#FFC857', marginTop: 10 }}>YOU DID IT! YOU FINISHED THE HUNT!</div>
      <div style={{ position: 'relative', color: '#ffe3cc', margin: '14px 0 30px', maxWidth: 260 }}>Show your team at the reception desk to claim your place.</div>
      <Link href="/player" style={{ position: 'relative', display: 'block', width: '100%', maxWidth: 300, height: 54, lineHeight: '54px', borderRadius: 16, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', textAlign: 'center', background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)', textDecoration: 'none' }}>
        Back to Dashboard
      </Link>
    </div>
  )

  if (result.success) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#2b0a4a,#5a2200 70%,#a8430f)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', animation: 'slideUp .45s cubic-bezier(.2,.8,.2,1)' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', marginBottom: 22, animation: 'pop .6s .2s both' }}>
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg>
    </div>
    <div style={{ fontSize: 13, letterSpacing: '.3em', color: '#ffd9b8', fontWeight: 600 }}>YOUR CODE IS</div>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 88, lineHeight: 1.1, letterSpacing: '.12em', background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 4px 24px rgba(255,170,60,.5))', animation: 'pop .6s .3s both' }}>
      {result.resultCode ?? result.displayNumber}
    </div>
    <div style={{ fontSize: 17, color: '#fff', maxWidth: 260, lineHeight: 1.4, margin: '6px 0 34px' }}>Go to the reception desk and show this code</div>
    <Link href="/player" style={{ display: 'block', width: '100%', maxWidth: 300, height: 54, lineHeight: '54px', borderRadius: 16, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', textAlign: 'center', background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)', textDecoration: 'none' }}>
      Back to Dashboard
    </Link>
  </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#4a0a14,#8a1426)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', animation: 'slideUp .45s cubic-bezier(.2,.8,.2,1)' }}>
    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.14)', border: '2px solid #ff8a8a', display: 'grid', placeItems: 'center', marginBottom: 22, animation: 'pop .5s .15s both' }}>
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </div>
    <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28 }}>Wrong QR code</div>
    <div style={{ fontSize: 16, color: '#ffd0d0', maxWidth: 270, lineHeight: 1.45, margin: '10px 0 34px' }}>{result.message}</div>
    <Link href="/player" style={{ display: 'block', width: '100%', maxWidth: 300, height: 54, lineHeight: '54px', borderRadius: 16, background: '#fff', color: '#8a1426', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, textAlign: 'center', textDecoration: 'none', marginBottom: 12 }}>Back to Dashboard</Link>
  </div>
  )
}
