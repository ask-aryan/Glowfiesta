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
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.2)',
        background: 'rgba(255,255,255,.08)',
        color: '#ffd9b8',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        transition: 'background .15s ease, transform .1s ease',
      }}
      onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.92)')}
      onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'transform 0.65s cubic-bezier(.4, 0, .2, 1)',
          transform: spinning ? 'rotate(360deg)' : 'none',
        }}
      >
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
      </svg>
    </button>
  )
}
