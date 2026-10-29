'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_ACTIONS: Record<string, { action: string; label: string; primary?: boolean }[]> = {
  DRAFT:     [{ action: 'start', label: 'Mark Ready', primary: true }],
  READY:     [{ action: 'start', label: 'Go Live', primary: true }],
  LIVE:      [{ action: 'pause', label: 'Pause', primary: true }, { action: 'close', label: 'Close Hunt' }],
  PAUSED:    [{ action: 'resume', label: 'Resume', primary: true }, { action: 'close', label: 'Close Hunt' }],
  COMPLETED: [],
}

export default function EventStatusActions({ eventId, currentStatus }: { eventId: number; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const actions = STATUS_ACTIONS[currentStatus] ?? []

  async function handleAction(action: string) {
    if (!confirm(`Are you sure you want to ${action} this event?`)) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/organizer/events/${eventId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Action failed'); return }
    router.refresh()
  }

  return (
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button
            key={a.action}
            onClick={() => handleAction(a.action)}
            disabled={loading}
            style={{
              borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              background: a.primary ? '#FF6B35' : '#fff',
              color: a.primary ? '#fff' : '#334155',
              border: `1px solid ${a.primary ? '#FF6B35' : '#cbd5e1'}`,
              transition: 'background .15s',
            }}
          >
            {a.label}
          </button>
        ))}
        {actions.length === 0 && (
          <span style={{ color: '#64748b', fontSize: 13 }}>Event is completed — no actions available.</span>
        )}
      </div>
    </div>
  )
}
