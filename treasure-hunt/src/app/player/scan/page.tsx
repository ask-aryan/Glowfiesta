'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ScanResult { success: boolean; message: string; resultCode?: string; final?: boolean }

// ── Selfie screen ──────────────────────────────────────────────────────────
function SelfieScreen({ onConfirm }: { onConfirm: (imageData: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [camError, setCamError] = useState('')
  const [uploading, setUploading] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      })
      .catch(() => setCamError('Camera access denied. Please allow camera permission and try again.'))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function takeShot() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Mirror horizontally so the captured photo matches the live selfie mirror preview
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85))
    setPreview(true)
  }

  function retake() { setPreview(false); setPreviewUrl('') }

  async function confirm() {
    setUploading(true)
    try {
      await fetch('/api/player/selfie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: previewUrl }),
      })
    } catch { /* non-blocking — proceed even if upload fails */ }
    streamRef.current?.getTracks().forEach(t => t.stop())
    setUploading(false)
    onConfirm(previewUrl)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%,#2a1238,#0a0414 75%)', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 18px' }}>
        <Link href="/player" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: '#fff', display: 'grid', placeItems: 'center', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Fredoka, sans-serif', fontSize: 18, marginRight: 40 }}>Team Selfie</div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 32px' }}>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, lineHeight: 1.2 }}>Everyone in the frame! 📸</div>
        <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 6 }}>Selfie is mandatory before each QR scan.</div>
      </div>

      {camError ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>📷</div>
          <div style={{ color: '#ff8a8a', fontWeight: 600, fontSize: 15 }}>{camError}</div>
          <div style={{ color: '#8b7fa8', fontSize: 13 }}>Go to your browser settings and allow camera access, then reload this page.</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '12px 28px', borderRadius: 14, border: 0, background: 'linear-gradient(135deg,#FFA23A,#FF6B35)', color: '#fff', fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ position: 'relative', width: 260, height: 320, borderRadius: '50% / 46%', overflow: 'hidden', border: `3px solid ${preview ? '#22c55e' : '#FF6B35'}`, background: 'rgba(10,4,20,.6)', boxShadow: '0 0 30px rgba(255,107,53,.35)', display: 'grid', placeItems: 'center' }}>
              {!preview ? (
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 14, right: 40, width: 36, height: 36, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', animation: 'pop .4s both' }}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg>
                  </div>
                </>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div style={{ padding: '8px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {!preview ? (
              <>
                <button onClick={takeShot} title="Take selfie" style={{ width: 76, height: 76, borderRadius: '50%', border: '4px solid #FFC857', background: 'transparent', padding: 4, cursor: 'pointer' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,#FFA23A,#FF6B35)' }} />
                </button>
                <div style={{ fontSize: 12, color: '#8b7fa8' }}>Tap to take selfie</div>
              </>
            ) : (
              <>
                <button onClick={confirm} disabled={uploading} style={{ width: '100%', height: 56, border: 0, borderRadius: 18, fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 19, letterSpacing: '.04em', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)', boxShadow: '0 8px 28px rgba(255,107,53,.5)', opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? 'Saving selfie…' : 'Use selfie & Scan QR'}
                </button>
                <button onClick={retake} disabled={uploading} style={{ background: 'none', border: 0, color: '#ffd9b8', fontSize: 14, cursor: 'pointer', padding: 6 }}>Retake</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main scanner ───────────────────────────────────────────────────────────
function ScanPageInner() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const scannerRef = useRef<HTMLDivElement>(null)
  const [selfieDone, setSelfieDone] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null)

  async function submitToken(token: string) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/player/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json()
      setResult(data)
    } catch { setResult({ success: false, message: 'Network error. Please try again.' }) }
    finally { setSubmitting(false) }
  }

  // If token in URL, skip selfie and submit directly
  useEffect(() => {
    if (tokenFromUrl && !result && !submitting) submitToken(tokenFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl])

  // Start QR scanner after selfie done
  useEffect(() => {
    if (!selfieDone || result || tokenFromUrl) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let html5QrCode: any
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!scannerRef.current) return
      html5QrCode = new Html5Qrcode('qr-reader')

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const qrboxSize = Math.floor(minEdge * 0.75)
        return { width: qrboxSize, height: qrboxSize }
      }

      function handleDecoded(decodedText: string) {
        try { html5QrCode.stop() } catch { /* ignore */ }
        setScanning(false)
        let token = decodedText.trim()
        const match = token.match(/scan\/([a-zA-Z0-9_-]+)/)
        if (match) {
          token = match[1]
        } else {
          token = token.split(/[?#/]/)[0]
        }
        submitToken(token)
      }

      setScanning(true)
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
        handleDecoded,
        () => { /* frame scanning in progress */ }
      ).catch((err: any) => {
        console.warn('Environment camera failed, falling back to default camera', err)
        html5QrCode.start(
          { facingMode: 'user' },
          { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
          handleDecoded,
          () => {}
        ).catch(() => setScanning(false))
      })

      scannerInstanceRef.current = html5QrCode
    })
    return () => { if (scannerInstanceRef.current) scannerInstanceRef.current.stop().catch(() => { /* ignore */ }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfieDone, result, tokenFromUrl])

  // Show selfie screen first (skip if token in URL)
  if (!selfieDone && !tokenFromUrl) {
    return <SelfieScreen onConfirm={() => setSelfieDone(true)} />
  }

  if (submitting) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', gap: 18 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{ position: 'absolute', left: '50%', top: 4, width: 90, height: 90, background: 'radial-gradient(circle,rgba(255,170,60,.55),rgba(255,107,53,0) 65%)', transform: 'translateX(-50%)', animation: 'halo-anim 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: 10, width: 20, height: 38, borderRadius: '50% 50% 50% 50% / 65% 65% 35% 35%', background: 'radial-gradient(ellipse at 50% 75%,#fff6c8 0,#FFC857 35%,#FF6B35 75%,rgba(255,60,0,0) 100%)', transformOrigin: '50% 100%', animation: 'flick .9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 14, width: 56, height: 24, marginLeft: -28, borderRadius: '0 0 56px 56px', background: 'linear-gradient(180deg,#e0832f,#8a3d10)' }} />
      </div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Checking your QR code…</div>
    </div>
  )

  if (result) {
    if (result.final) return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#1a0533,#4a1a00 70%,#FF6B35 160%)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', animation: 'slideUp .45s ease', position: 'relative', color: '#fff' }}>
        <div style={{ position: 'absolute', left: '25%', top: '30%', width: 280, height: 280, borderRadius: '50%', border: '4px solid #FFC857', animation: 'burst 1.8s ease-out infinite' }} />
        <div style={{ position: 'absolute', left: '75%', top: '22%', width: 240, height: 240, borderRadius: '50%', border: '4px solid #ff6b9a', animation: 'burst 1.8s .6s ease-out infinite' }} />
        <div style={{ position: 'relative', fontSize: 84, animation: 'pop .7s both' }}>🏆</div>
        <div style={{ position: 'relative', fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28, color: '#FFC857', marginTop: 10 }}>YOU DID IT! YOU FINISHED THE HUNT!</div>
        <div style={{ position: 'relative', color: '#ffe3cc', margin: '14px 0 30px', maxWidth: 260 }}>Show your team at the reception desk to claim your place on the board.</div>
        <Link href="/player" style={{ position: 'relative', display: 'block', width: '100%', maxWidth: 300, height: 54, lineHeight: '54px', borderRadius: 16, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', textAlign: 'center', background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)', boxShadow: '0 8px 28px rgba(255,107,53,.45)', textDecoration: 'none' }}>Back to Dashboard</Link>
      </div>
    )

    if (result.success) return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#2b0a4a,#5a2200 70%,#a8430f)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', animation: 'slideUp .45s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', marginBottom: 22, animation: 'pop .6s .2s both' }}>
          <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg>
        </div>
        <div style={{ fontSize: 13, letterSpacing: '.3em', color: '#ffd9b8', fontWeight: 600 }}>YOUR CODE IS</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 88, lineHeight: 1.1, letterSpacing: '.12em', background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 4px 24px rgba(255,170,60,.5))', animation: 'pop .6s .3s both' }}>{result.resultCode}</div>
        <div style={{ fontSize: 17, color: '#fff', maxWidth: 260, lineHeight: 1.4, margin: '6px 0 34px' }}>Go to the reception desk and show this code</div>
        <Link href="/player" style={{ display: 'block', width: '100%', maxWidth: 300, height: 54, lineHeight: '54px', borderRadius: 16, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', textAlign: 'center', background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)', boxShadow: '0 8px 28px rgba(255,107,53,.45)', textDecoration: 'none' }}>Back to Dashboard</Link>
      </div>
    )

    // Failed
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#4a0a14,#8a1426)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', animation: 'slideUp .45s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.14)', border: '2px solid #ff8a8a', display: 'grid', placeItems: 'center', marginBottom: 22, animation: 'pop .5s .15s both' }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 24, marginBottom: 12 }}>Oops!</div>
        <div style={{ fontSize: 17, color: '#ffd0d0', maxWidth: 300, lineHeight: 1.5, margin: '0 0 34px' }}>{result.message}</div>
        <button onClick={() => { setResult(null); setSelfieDone(false) }} style={{ width: '100%', maxWidth: 300, height: 54, borderRadius: 16, border: 0, background: '#fff', color: '#8a1426', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 18, cursor: 'pointer', marginBottom: 12 }}>
          Try Again
        </button>
        <Link href="/player" style={{ color: '#ffd0d0', fontSize: 14 }}>Back to Dashboard</Link>
      </div>
    )
  }

  // QR Scanner view
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 40%,#2a1238,#0a0414 75%)', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 18px' }}>
        <button onClick={() => setSelfieDone(false)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 18 }}>←</button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Fredoka, sans-serif', fontSize: 18, marginRight: 40 }}>Scan QR</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 20px' }}>
        <div style={{
          position: 'relative',
          width: 280,
          height: 280,
          borderRadius: 24,
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 0 35px rgba(255,107,53,.35)',
          border: '2px solid rgba(255,200,87,.5)',
        }}>
          {/* Active Camera Viewfinder */}
          <div
            id="qr-reader"
            ref={scannerRef}
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }}
          />

          {/* Scanner Overlay (Brackets & Laser) */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute',
              left: 12,
              right: 12,
              height: 2,
              background: 'linear-gradient(90deg,transparent,#FF6B35,transparent)',
              boxShadow: '0 0 14px #FF6B35',
              animation: 'sweep 2.2s ease-in-out infinite alternate',
            }} />
            <div style={{ position: 'absolute', left: 8, top: 8, width: 42, height: 42, borderLeft: '5px solid #FFC857', borderTop: '5px solid #FFC857', borderRadius: '14px 0 0 0', animation: 'bracket 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', right: 8, top: 8, width: 42, height: 42, borderRight: '5px solid #FFC857', borderTop: '5px solid #FFC857', borderRadius: '0 14px 0 0', animation: 'bracket 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: 8, bottom: 8, width: 42, height: 42, borderLeft: '5px solid #FFC857', borderBottom: '5px solid #FFC857', borderRadius: '0 0 0 14px', animation: 'bracket 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', right: 8, bottom: 8, width: 42, height: 42, borderRight: '5px solid #FFC857', borderBottom: '5px solid #FFC857', borderRadius: '0 0 14px 0', animation: 'bracket 1.6s ease-in-out infinite' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20 }}>
            {scanning ? 'Point at your QR code' : 'Initializing camera…'}
          </div>
          <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 6 }}>
            Keep the QR code inside the golden brackets
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 40%,#2a1238,#0a0414 75%)' }} />}>
      <ScanPageInner />
    </Suspense>
  )
}
