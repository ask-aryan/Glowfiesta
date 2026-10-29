'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerMenu({
  teamName,
  eventName,
}: {
  teamName: string
  eventName: string
}) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    const confirmed = window.confirm(
      `Are you sure you want to sign out of ${teamName}? You will need your login credentials to sign back in.`
    )
    if (!confirmed) return

    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return (
    <>
      {/* Hamburger Button next to team name */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        title="Menu"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1.5px solid rgba(255,255,255,0.22)',
          background: 'rgba(255,255,255,0.09)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'transform .1s ease, background .15s ease',
        }}
        onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.92)')}
        onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <line x1="3.5" y1="6" x2="20.5" y2="6" />
          <line x1="3.5" y1="12" x2="20.5" y2="12" />
          <line x1="3.5" y1="18" x2="20.5" y2="18" />
        </svg>
      </button>

      {/* Drawer Overlay & Panel */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
            }}
          />

          {/* Slide-out Drawer Panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 300,
              maxWidth: '82vw',
              background: 'linear-gradient(180deg, #1c0831 0%, #0d0417 100%)',
              borderRight: '1.5px solid rgba(255,200,87,0.3)',
              boxShadow: '8px 0 32px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: '22px 20px',
              color: '#fff',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {/* Header: Title and Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🪔</span>
                <span
                  style={{
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 700,
                    fontSize: 18,
                    background: 'linear-gradient(180deg, #fff0b3 0%, #FFC857 60%, #e8962a 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  GlowFiesta
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* Team Info Card */}
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, color: '#ffd9b8', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                Signed In Team
              </div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, marginTop: 4, color: '#fff' }}>
                {teamName}
              </div>
              <div style={{ fontSize: 12, color: '#FF8A57', marginTop: 2, fontWeight: 600 }}>
                {eventName}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.12)',
                  color: '#fca5a5',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: loggingOut ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background .15s ease',
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </div>

            {/* Footer: Made with ❤️ by Aryan */}
            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                fontSize: 13,
                color: '#ffd9b8',
                fontWeight: 600,
                letterSpacing: '.02em',
              }}
            >
              Made with <span style={{ color: '#ef4444' }}>❤️</span> by Aryan
            </div>
          </div>
        </div>
      )}
    </>
  )
}
