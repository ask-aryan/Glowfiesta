'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ScanTokenPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    async function redirectForScan() {
      try {
        const meRes = await fetch('/api/auth/me')
        if (!meRes.ok) {
          router.replace(`/login?redirect=${encodeURIComponent(`/player/scan?token=${params.token}`)}`)
          return
        }
        const meData = await meRes.json()
        if (meData.role !== 'TEAM') {
          setAuthError(true)
          return
        }
        // Redirect to in-app camera scanner so team selfie is MANDATORY
        router.replace(`/player/scan?token=${params.token}`)
      } catch {
        router.replace(`/login?redirect=${encodeURIComponent(`/player/scan?token=${params.token}`)}`)
      }
    }
    redirectForScan()
  }, [params.token, router])

  const bg = 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)'

  if (authError) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, marginBottom: 8 }}>Not a player account</div>
        <div style={{ color: '#ffd9b8', marginBottom: 24 }}>Only team players can scan QR codes.</div>
        <Link href="/login" style={{ background: 'linear-gradient(135deg,#FFA23A,#FF6B35)', color: '#fff', padding: '12px 24px', borderRadius: 14, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, textDecoration: 'none' }}>Go to Login</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{ position: 'absolute', left: '50%', top: 4, width: 90, height: 90, background: 'radial-gradient(circle,rgba(255,170,60,.55),rgba(255,107,53,0) 65%)', transform: 'translateX(-50%)', animation: 'halo-anim 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: 10, width: 20, height: 38, borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%', background: 'radial-gradient(ellipse at 50% 75%,#fff6c8 0,#FFC857 35%,#FF6B35 75%,rgba(255,60,0,0) 100%)', transformOrigin: '50% 100%', animation: 'flick .9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 14, width: 56, height: 24, marginLeft: -28, borderRadius: '0 0 56px 56px', background: 'linear-gradient(180deg,#e0832f,#8a3d10)' }} />
      </div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Opening Team Scanner…</div>
      <div style={{ fontSize: 13, color: '#ffd9b8' }}>Mandatory team selfie required before verification</div>
    </div>
  )
}
