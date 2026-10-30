'use client'
import React, { Suspense, useEffect, useRef, useState, Component, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

class ScannerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorText: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, errorText: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorText: error?.message || 'Unexpected camera glitch' }
  }
  componentDidCatch(err: any) {
    console.warn('Scanner caught error:', err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 40%,#2a1238,#0a0414 75%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Camera scanner reset needed</div>
          <div style={{ fontSize: 14, color: '#ffd9b8', maxWidth: 280, marginBottom: 24 }}>The camera session encountered a temporary issue. Tap below to reload.</div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', borderRadius: 14, border: 0, background: 'linear-gradient(135deg,#FFA23A,#FF6B35)', color: '#fff', fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,107,53,.4)' }}
          >
            Restart Scanner
          </button>
          <Link href="/player" style={{ color: '#ffd9b8', fontSize: 14, marginTop: 16 }}>Back to Dashboard</Link>
        </div>
      )
    }
    return this.props.children
  }
}

interface ScanResult {
  success: boolean
  message: string
  resultCode?: string
  final?: boolean
  isLastStage?: boolean
}

// ── Selfie screen ──────────────────────────────────────────────────────────
function SelfieScreen({ onConfirm }: { onConfirm: (imageData: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [camError, setCamError] = useState('')
  const [uploading, setUploading] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCamError('Camera access is not supported by this browser or connection. Please use Chrome/Safari over HTTPS.')
      return
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // ignore play rejection
        }
      }
      setCamError('')
    } catch (err) {
      console.warn('Camera error:', err)
      setCamError('Camera access denied or unavailable. Please allow camera permission and try again.')
    }
  }

  useEffect(() => {
    let mounted = true
    startCamera()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function takeShot() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    if (width === 0 || height === 0) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Mirror horizontally so the captured photo matches the live selfie mirror preview
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, width, height)
    try {
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85))
      setPreview(true)
    } catch (e) {
      console.warn('Canvas toDataURL failed:', e)
    }
  }

  function retake() {
    setPreview(false)
    setPreviewUrl('')
    if (videoRef.current && streamRef.current && streamRef.current.active) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
      videoRef.current.play().catch(() => {})
    } else {
      startCamera()
    }
  }

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
    streamRef.current = null
    setUploading(false)
    onConfirm(previewUrl)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%,#2a1238,#0a0414 75%)', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px' }}>
        <Link
          href="/player"
          aria-label="Back to dashboard"
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            border: '1.5px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            transition: 'all .15s ease',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Fredoka, sans-serif', fontSize: 19, marginRight: 42, fontWeight: 700 }}>Team Selfie</div>
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
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: preview ? 'none' : 'block',
                }}
                muted
                playsInline
                autoPlay
              />
              {preview && (
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
                <button
                  onClick={confirm}
                  disabled={uploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    width: '100%',
                    height: 56,
                    border: 0,
                    borderRadius: 18,
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 700,
                    fontSize: 19,
                    letterSpacing: '.04em',
                    color: '#fff',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)',
                    boxShadow: '0 8px 28px rgba(255,107,53,.5)',
                    opacity: uploading ? 0.75 : 1,
                  }}
                >
                  {uploading ? (
                    <>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '2.5px solid rgba(255,255,255,.3)',
                          borderTopColor: '#fff',
                          animation: 'spin 0.75s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                      <span>Saving selfie…</span>
                    </>
                  ) : (
                    'Use selfie & Scan QR'
                  )}
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
  const isHandlingRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null)

  async function stopScanner(instance: any) {
    if (!instance) return
    try {
      if (typeof instance.isScanning === 'boolean' ? instance.isScanning : true) {
        await instance.stop().catch(() => {})
      }
    } catch {
      // ignore stop errors
    }
    try {
      if (typeof document !== 'undefined' && document.getElementById('qr-reader')) {
        instance.clear()
      }
    } catch {
      // ignore clear error
    }
  }

  async function submitToken(token: string) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/player/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isSwitching, setIsSwitching] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5ModuleRef = useRef<any>(null)

  const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
    const qrboxSize = Math.floor(minEdge * 0.75)
    return { width: qrboxSize, height: qrboxSize }
  }

  const handleDecoded = async (decodedText: string) => {
    if (isHandlingRef.current) return
    isHandlingRef.current = true
    setScanning(false)

    const inst = scannerInstanceRef.current
    scannerInstanceRef.current = null
    if (inst) {
      await stopScanner(inst)
    }

    let token = decodedText.trim()
    const match = token.match(/scan\/([a-zA-Z0-9_-]+)/)
    if (match) {
      token = match[1]
    } else {
      token = token.split(/[?#/]/)[0]
    }
    await submitToken(token)
  }

  async function handleSwitchCamera() {
    if (cameraList.length <= 1 || isSwitching) return
    setIsSwitching(true)

    const currentIdx = cameraList.findIndex(c => c.id === selectedCameraId)
    const nextIdx = (currentIdx + 1) % cameraList.length
    const nextCam = cameraList[nextIdx]
    setSelectedCameraId(nextCam.id)

    const inst = scannerInstanceRef.current
    scannerInstanceRef.current = null
    if (inst) {
      await stopScanner(inst)
    }

    const Html5Qrcode = html5ModuleRef.current
    if (!Html5Qrcode) {
      setIsSwitching(false)
      return
    }

    try {
      const newScanner = new Html5Qrcode('qr-reader')
      scannerInstanceRef.current = newScanner
      setScanning(true)
      await newScanner.start(
        nextCam.id,
        { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
        handleDecoded,
        () => {}
      )
    } catch (err) {
      console.warn('Switching camera failed:', err)
    } finally {
      setIsSwitching(false)
    }
  }

  // Start QR scanner after selfie done
  useEffect(() => {
    if (!selfieDone || result || tokenFromUrl) return
    isHandlingRef.current = false
    let isCancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let html5QrCode: any

    import('html5-qrcode').then(async ({ Html5Qrcode }) => {
      if (isCancelled) return
      html5ModuleRef.current = Html5Qrcode
      const elem = document.getElementById('qr-reader')
      if (!elem) return

      try {
        // Enumerate all available cameras to avoid ultra-wide (0.5x) lens
        let allCams: Array<{ id: string; label: string }> = []
        try {
          allCams = await Html5Qrcode.getCameras()
        } catch {
          allCams = []
        }

        if (isCancelled) return

        // Filter rear cameras
        const backCams = allCams.filter(c => {
          const l = (c.label || '').toLowerCase()
          return l.includes('back') || l.includes('rear') || l.includes('environment') || (!l.includes('front') && !l.includes('selfie'))
        })
        const candidates = backCams.length > 0 ? backCams : allCams

        // Prioritize standard 1x main camera: filter OUT ultra-wide, 0.5x, macro, telephoto
        const nonUltra = candidates.filter(c => {
          const l = (c.label || '').toLowerCase()
          return !l.includes('ultra') && !l.includes('0.5') && !l.includes('wide-angle') && !l.includes('macro') && !l.includes('tele')
        })

        const chosenCamera = nonUltra.length > 0 ? nonUltra[0] : candidates[0]
        setCameraList(candidates)
        if (chosenCamera) setSelectedCameraId(chosenCamera.id)

        html5QrCode = new Html5Qrcode('qr-reader')
        scannerInstanceRef.current = html5QrCode

        setScanning(true)
        const camConfig = chosenCamera ? chosenCamera.id : { facingMode: 'environment' }

        html5QrCode.start(
          camConfig,
          { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
          handleDecoded,
          () => { /* frame scanning in progress */ }
        ).catch((err: any) => {
          if (isCancelled) return
          console.warn('Primary camera start failed, falling back to environment constraint', err)
          html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
            handleDecoded,
            () => {}
          ).catch(() => {
            if (!isCancelled) setScanning(false)
          })
        })
      } catch (e) {
        console.warn('Html5Qrcode initialization error:', e)
        if (!isCancelled) setScanning(false)
      }
    }).catch(err => {
      console.warn('Failed to load html5-qrcode module:', err)
      if (!isCancelled) setScanning(false)
    })

    return () => {
      isCancelled = true
      if (scannerInstanceRef.current) {
        const inst = scannerInstanceRef.current
        scannerInstanceRef.current = null
        stopScanner(inst)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfieDone, result, tokenFromUrl])

  // Mandatory selfie screen first (even if token is passed via external QR scan)
  if (!selfieDone) {
    return (
      <SelfieScreen
        onConfirm={() => {
          setSelfieDone(true)
          if (tokenFromUrl) {
            submitToken(tokenFromUrl)
          }
        }}
      />
    )
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
        <div style={{ fontSize: 17, color: '#fff', maxWidth: 280, lineHeight: 1.4, margin: '6px 0 34px' }}>
          {result.isLastStage
            ? '🎉 Last stage completed! Go to the reception desk to unlock your FINAL CLUE!'
            : 'Go to the reception desk and show this code'}
        </div>
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
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px' }}>
        <button
          onClick={() => setSelfieDone(false)}
          aria-label="Back to selfie"
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            border: '1.5px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            transition: 'all .15s ease',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Fredoka, sans-serif', fontSize: 19, marginRight: 42, fontWeight: 700 }}>Scan QR</div>
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

          {cameraList.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              disabled={isSwitching}
              style={{
                marginTop: 14,
                padding: '8px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,200,87,0.5)',
                color: '#FFC857',
                fontSize: 13,
                fontWeight: 700,
                cursor: isSwitching ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'all .15s ease',
              }}
            >
              <span style={{ fontSize: 16 }}>🔄</span>
              <span>{isSwitching ? 'Switching…' : `Switch Lens (${cameraList.findIndex(c => c.id === selectedCameraId) + 1}/${cameraList.length})`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <ScannerErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 40%,#2a1238,#0a0414 75%)' }} />}>
        <ScanPageInner />
      </Suspense>
    </ScannerErrorBoundary>
  )
}
