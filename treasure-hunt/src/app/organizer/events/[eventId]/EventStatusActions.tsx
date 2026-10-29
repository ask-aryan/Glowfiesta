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

export default function EventStatusActions({
  eventId,
  currentStatus,
  isAllReadyForLaunch = true,
  unreadyReasons = [],
}: {
  eventId: number
  currentStatus: string
  isAllReadyForLaunch?: boolean
  unreadyReasons?: string[]
}) {
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

  const isDraftUnready = currentStatus === 'DRAFT' && !isAllReadyForLaunch

  return (
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {actions.map(a => {
          const isButtonDisabled = loading || (isDraftUnready && a.action === 'start')

          return (
            <button
              key={a.action}
              onClick={() => handleAction(a.action)}
              disabled={isButtonDisabled}
              title={
                isDraftUnready && a.action === 'start'
                  ? `Complete all setup steps before marking ready:\n• ${unreadyReasons.join('\n• ')}`
                  : undefined
              }
              style={{
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: 13,
                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                opacity: isButtonDisabled ? 0.6 : (loading ? 0.7 : 1),
                background: isDraftUnready && a.action === 'start'
                  ? '#e2e8f0'
                  : (a.primary ? '#FF6B35' : '#fff'),
                color: isDraftUnready && a.action === 'start'
                  ? '#64748b'
                  : (a.primary ? '#fff' : '#334155'),
                border: `1px solid ${isDraftUnready && a.action === 'start' ? '#cbd5e1' : (a.primary ? '#FF6B35' : '#cbd5e1')}`,
                transition: 'all .15s ease',
              }}
            >
              {a.label}
            </button>
          )
        })}
        {actions.length === 0 && (
          <span style={{ color: '#64748b', fontSize: 13 }}>Event is completed — no actions available.</span>
        )}
      </div>

      {/* Notice if setup incomplete */}
      {isDraftUnready && unreadyReasons.length > 0 && (
        <div style={{
          marginTop: 10,
          padding: '9px 12px',
          borderRadius: 8,
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          fontSize: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.2 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600 }}>Complete all setup steps to enable "Mark Ready":</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
              {unreadyReasons.map((r, i) => (
                <span key={i} style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                  • {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notice if ready to launch */}
      {currentStatus === 'DRAFT' && isAllReadyForLaunch && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>✓</span> All preparation steps completed. Click &quot;Mark Ready&quot; when you are ready to prepare for launch!
        </div>
      )}
    </div>
  )
}
