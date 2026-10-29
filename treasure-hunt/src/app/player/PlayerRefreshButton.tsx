'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerRefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    if (spinning) return
    setSpinning(true)
    router.refresh()
    setTimeout(() => {
      setSpinning(false)
    }, 700)
  }

  return (
    <button
      onClick={handleRefresh}
      title="Refresh status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 999,
        border: '1.5px solid rgba(255,200,87,0.4)',
        background: 'rgba(255,200,87,0.12)',
        color: '#FFC857',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all .15s ease',
      }}
      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.94)')}
      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'transform 0.65s cubic-bezier(.4, 0, .2, 1)',
          transform: spinning ? 'rotate(360deg)' : 'none',
        }}
      >
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
      </svg>
      <span>{spinning ? 'Syncing…' : 'Refresh'}</span>
    </button>
  )
}
