'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface HintCardProps {
  stageNumber: number
  isEligibleStage: boolean
  usedHintOnThisStage: boolean
  hintResolvedAt?: string | null
  hintsUsedTotal: number
  maxHints: number
  hintDelayMinutes: number
  stageStartTimeIso: string
  teamName: string
}

export default function HintCard({
  stageNumber,
  isEligibleStage,
  usedHintOnThisStage,
  hintResolvedAt,
  hintsUsedTotal,
  maxHints,
  hintDelayMinutes,
  stageStartTimeIso,
  teamName,
}: HintCardProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const startTime = new Date(stageStartTimeIso).getTime()

    function updateElapsed() {
      const diffMs = Math.max(0, Date.now() - startTime)
      setElapsedSeconds(Math.floor(diffMs / 1000))
    }

    updateElapsed()
    const timer = setInterval(updateElapsed, 1000)
    return () => clearInterval(timer)
  }, [stageStartTimeIso])

  if (!isEligibleStage) {
    return null
  }

  const hintsRemaining = Math.max(0, maxHints - hintsUsedTotal)
  const thresholdSeconds = hintDelayMinutes * 60
  const isTimeUnlocked = elapsedSeconds >= thresholdSeconds
  const secondsLeft = Math.max(0, thresholdSeconds - elapsedSeconds)
  const minutesLeft = Math.floor(secondsLeft / 60)
  const remainingSecondsDisplay = secondsLeft % 60

  // If a hint was already requested for this stage
  if (usedHintOnThisStage) {
    if (hintResolvedAt) {
      return (
        <div
          style={{
            marginTop: 10,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(21, 128, 61, 0.22) 100%)',
            border: '1.5px solid #22c55e',
            borderRadius: 14,
            padding: '12px 14px',
            boxShadow: '0 0 16px rgba(34, 197, 94, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>✅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#86efac', fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Hint Provided by Organizer
              </div>
              <div style={{ color: '#fff', fontSize: 13, marginTop: 2 }}>
                Your Stage {stageNumber} hint was provided at reception. Best of luck on the hunt!
              </div>
              <div style={{ color: '#bbf7d0', fontSize: 11, fontWeight: 700, marginTop: 3 }}>
                Hints remaining for your team: {hintsRemaining} of {maxHints}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        style={{
          marginTop: 10,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.25) 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: 14,
          padding: '12px 14px',
          boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
          animation: 'pulse 2s infinite',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>💡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#fde047', fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Hint Requested for Stage {stageNumber}
            </div>
            <div style={{ color: '#fff', fontSize: 13, marginTop: 3, lineHeight: 1.35 }}>
              Head to the <strong>Reception Desk</strong> now and ask the organizer for your Stage {stageNumber} hint!
            </div>
            <div style={{ color: '#fef08a', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
              Team: {teamName} · Hints remaining: {hintsRemaining} of {maxHints}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If the team has exhausted all hints across the entire hunt
  if (hintsRemaining <= 0) {
    return (
      <div
        style={{
          marginTop: 10,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11.5,
          color: '#94a3b8',
        }}
      >
        <span>💡</span>
        <span>All {maxHints} hints used for your team. Race on your own wits!</span>
      </div>
    )
  }

  async function handleConfirmHint() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/player/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to request hint')
      } else {
        setShowModal(false)
        router.refresh()
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginTop: 10 }}>
        {isTimeUnlocked ? (
          // Pulsing Hint Available Button
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.22) 0%, rgba(245, 158, 11, 0.3) 100%)',
              border: '1.5px solid #facc15',
              boxShadow: '0 0 20px rgba(250, 204, 21, 0.35)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              animation: 'glow-box 2.2s infinite ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <span style={{ fontSize: 24 }}>💡</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#fef08a' }}>
                  Need a Hint for Stage {stageNumber}?
                </div>
                <div style={{ fontSize: 11, color: '#fef9c3', marginTop: 1 }}>
                  Tap to request a hint at the reception desk
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 8,
                background: '#ca8a04',
                color: '#fff',
                whiteSpace: 'nowrap',
              }}
            >
              {hintsRemaining} left
            </span>
          </button>
        ) : (
          // Locked countdown bar
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11.5,
              color: '#cbd5e1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏳</span>
              <span>Hint unlocks after {hintDelayMinutes}m on stage:</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#facc15' }}>
              {minutesLeft}:{remainingSecondsDisplay.toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#1c1917',
              border: '2px solid #facc15',
              borderRadius: 20,
              padding: '24px 20px',
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 0 35px rgba(250, 204, 21, 0.4)',
              color: '#fff',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 8 }}>💡</div>
            <h3
              style={{
                textAlign: 'center',
                margin: 0,
                fontSize: 19,
                fontWeight: 800,
                color: '#fef08a',
              }}
            >
              Request Stage {stageNumber} Hint?
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: '#e7e5e4',
                marginTop: 10,
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              This will use <strong>1 of your {hintsRemaining} remaining hints</strong> for this event.
            </p>
            <div
              style={{
                margin: '14px 0',
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(250, 204, 21, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                fontSize: 12.5,
                color: '#fef08a',
                lineHeight: 1.4,
              }}
            >
              🚶 <strong>Next step:</strong> After confirming, go to the <strong>Reception Desk</strong> and ask the organizer for your hint.
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#fca5a5',
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setErrorMsg(null)
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHint}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.4)',
                }}
              >
                {loading ? 'Requesting…' : 'Confirm & Go to Desk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
