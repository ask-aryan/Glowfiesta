'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App-level client error:', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 35%, #2a1238, #0a0414 75%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 12 }}>🪔</div>
      <div
        style={{
          fontFamily: 'Fredoka, sans-serif',
          fontSize: 26,
          fontWeight: 700,
          background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 60%, #e8962a 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          marginBottom: 8,
        }}
      >
        Something took a detour!
      </div>
      <div
        style={{
          fontSize: 14,
          color: '#ffd9b8',
          maxWidth: 320,
          lineHeight: 1.5,
          marginBottom: 26,
        }}
      >
        A temporary glitch occurred. Tap below to reload the screen and resume.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <button
          onClick={() => reset()}
          style={{
            height: 50,
            borderRadius: 14,
            border: 0,
            background: 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)',
            color: '#fff',
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
          }}
        >
          Try Again
        </button>

        <Link
          href="/player"
          style={{
            height: 50,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          Go to Player Dashboard
        </Link>
      </div>
    </div>
  )
}
