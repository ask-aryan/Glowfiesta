'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerLogout({
  teamName,
  variant = 'link',
}: {
  teamName?: string
  variant?: 'button' | 'link'
}) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    const confirmed = window.confirm(
      `Are you sure you want to sign out${teamName ? ` of ${teamName}` : ''}? You will need your login to resume the hunt.`
    )
    if (!confirmed) return

    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          background: 'none',
          border: 0,
          color: '#ffd9b8',
          fontSize: 12,
          fontWeight: 600,
          cursor: loggingOut ? 'not-allowed' : 'pointer',
          padding: '2px 6px',
          textDecoration: 'underline',
          opacity: 0.85,
        }}
      >
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      title="Sign out"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.18)',
        background: 'rgba(255,255,255,.07)',
        color: '#ffd9b8',
        cursor: loggingOut ? 'not-allowed' : 'pointer',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    </button>
  )
}
