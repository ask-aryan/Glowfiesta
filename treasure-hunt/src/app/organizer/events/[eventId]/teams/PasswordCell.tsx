'use client'
import { useState } from 'react'

export default function PasswordCell({ password }: { password: string }) {
  const [revealed, setRevealed] = useState(false)

  if (!password) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
  }

  return (
    <span
      onClick={() => setRevealed(v => !v)}
      title={revealed ? 'Click to hide' : 'Click to reveal'}
      style={{
        display: 'inline-flex', gap: 8, alignItems: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        background: '#f1f5f9', border: '1px solid #e2e8f0',
        borderRadius: 999, padding: '3px 10px', cursor: 'pointer',
        color: '#334155', minWidth: 72, userSelect: 'none',
      }}
    >
      {revealed ? password : '••••••••'}
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.2} strokeLinecap="round">
        {revealed
          ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        }
      </svg>
    </span>
  )
}
