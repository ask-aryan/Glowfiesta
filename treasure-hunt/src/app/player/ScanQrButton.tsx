'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanQrButton({ isLive, isPaused }: { isLive: boolean; isPaused: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleClick() {
    if (!isLive || isPaused || loading) return
    setLoading(true)
    router.push('/player/scan')
  }

  const disabled = !isLive || isPaused || loading

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        height: 64,
        border: 'none',
        borderRadius: 20,
        fontFamily: 'Fredoka, sans-serif',
        fontWeight: 700,
        fontSize: 21,
        letterSpacing: '.08em',
        color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isLive ? 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)' : 'rgba(255,255,255,.15)',
        boxShadow: isLive ? '0 8px 28px rgba(255,107,53,.5)' : 'none',
        opacity: isPaused ? 0.45 : loading ? 0.8 : 1,
        transition: 'transform .1s ease, opacity .15s ease',
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,.3)',
              borderTopColor: '#fff',
              animation: 'spin 0.75s linear infinite',
              display: 'inline-block',
            }}
          />
          <span>OPENING CAMERA…</span>
        </>
      ) : (
        <>
          <svg
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
          </svg>
          <span>{isPaused ? 'PAUSED' : isLive ? 'SCAN QR' : 'HUNT NOT STARTED'}</span>
        </>
      )}
    </button>
  )
}
