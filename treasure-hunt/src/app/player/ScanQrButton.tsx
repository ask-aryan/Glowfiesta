'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanQrButton({
  isLive,
  isPaused,
  eventStatus = 'DRAFT',
  isFinal = false,
}: {
  isLive: boolean
  isPaused: boolean
  eventStatus?: string
  isFinal?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleClick() {
    if (!isLive || isPaused || loading) return
    setLoading(true)
    router.push('/player/scan')
  }

  const disabled = !isLive || isPaused || loading

  const buttonLabel = isPaused
    ? 'PAUSED'
    : isLive
    ? isFinal
      ? '🏆 SCAN FINAL QR'
      : 'SCAN QR'
    : eventStatus === 'COMPLETED'
    ? '🏁 HUNT HAS ENDED'
    : eventStatus === 'READY'
    ? 'STARTING SOON'
    : 'HUNT NOT STARTED'

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        height: 52,
        border: isFinal ? '2px solid #FFC857' : 'none',
        borderRadius: 16,
        fontFamily: 'Fredoka, sans-serif',
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: '.06em',
        color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isLive
          ? isFinal
            ? 'linear-gradient(135deg,#FFA23A 0%,#FF6B35 50%,#e8431a 100%)'
            : 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)'
          : eventStatus === 'COMPLETED'
          ? 'rgba(239, 68, 68, 0.16)'
          : 'rgba(255,255,255,.15)',
        boxShadow: isLive ? (isFinal ? '0 6px 24px rgba(255,200,87,.5)' : '0 6px 20px rgba(255,107,53,.45)') : 'none',
        opacity: isPaused ? 0.45 : disabled ? 0.75 : loading ? 0.8 : 1,
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
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
          </svg>
          <span>{buttonLabel}</span>
        </>
      )}
    </button>
  )
}
