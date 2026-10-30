'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: number
  initialData: {
    name: string
    description?: string | null
    status: string
    gameType: string
    teamCount: number
    stagesPerTeam: number
    membersPerTeam?: number | null
    hasCommonFinalQr?: boolean
    maxHintsPerTeam?: number
    hintDelayMinutes?: number
  }
  triggerLabel?: string
  isIconOnly?: boolean
}

export default function EditEventModal({
  eventId,
  initialData,
  triggerLabel = 'Edit Event',
  isIconOnly = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isDraft = initialData.status === 'DRAFT'
  const isScoreGame = initialData.gameType === 'QUIZ' || initialData.gameType === 'FUNTAKSHARI'

  const [form, setForm] = useState({
    name: initialData.name,
    description: initialData.description || '',
    teamCount: initialData.teamCount,
    stagesPerTeam: initialData.stagesPerTeam,
    membersPerTeam: initialData.membersPerTeam || 4,
    hasCommonFinalQr: initialData.hasCommonFinalQr ?? true,
    maxHintsPerTeam: initialData.maxHintsPerTeam ?? 2,
    hintDelayMinutes: initialData.hintDelayMinutes ?? 5,
  })

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  function handleOpen() {
    setForm({
      name: initialData.name,
      description: initialData.description || '',
      teamCount: initialData.teamCount,
      stagesPerTeam: initialData.stagesPerTeam,
      membersPerTeam: initialData.membersPerTeam || 4,
      hasCommonFinalQr: initialData.hasCommonFinalQr ?? true,
      maxHintsPerTeam: initialData.maxHintsPerTeam ?? 2,
      hintDelayMinutes: initialData.hintDelayMinutes ?? 5,
    })
    setErr('')
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErr('Event name is required')
      return
    }

    setSaving(true)
    setErr('')

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    }

    if (!isScoreGame) {
      payload.maxHintsPerTeam = Number(form.maxHintsPerTeam)
      payload.hintDelayMinutes = Number(form.hintDelayMinutes)
    }

    if (isDraft) {
      payload.teamCount = Number(form.teamCount)
      payload.membersPerTeam = Number(form.membersPerTeam)
      if (!isScoreGame) {
        payload.stagesPerTeam = Number(form.stagesPerTeam)
        payload.hasCommonFinalQr = Boolean(form.hasCommonFinalQr)
      }
    }

    try {
      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.ok) {
        const d = await res.json()
        setErr(d.error || 'Failed to update event')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setSaving(false)
      setErr('Network error. Please try again.')
    }
  }

  return (
    <>
      {isIconOnly ? (
        <button
          onClick={handleOpen}
          type="button"
          title="Edit event settings"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 8px',
            cursor: 'pointer',
            color: '#475569',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleOpen}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>{triggerLabel}</span>
        </button>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              padding: '24px 28px',
              width: '100%',
              maxWidth: 480,
              boxSizing: 'border-box',
              position: 'relative',
              animation: 'pop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Edit Event Details</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {initialData.name} ({initialData.status})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                ✕
              </button>
            </div>

            {/* Status notice */}
            {isDraft ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>🟢</span>
                <span>
                  <strong>DRAFT MODE:</strong> You can freely update the event name, description, number of teams, and stages.
                </span>
              </div>
            ) : (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>🔒</span>
                <span>
                  <strong>LOCKED:</strong> Team count and stages cannot be changed because this event is <strong>{initialData.status}</strong>. Only name and description can be updated.
                </span>
              </div>
            )}

            {err && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 }}>
                {err}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                  EVENT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional brief description or rules..."
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Structural fields: only editable in DRAFT */}
              {isDraft && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>
                    Event Structure & Configuration
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isScoreGame ? '1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        TEAM COUNT
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        required
                        value={form.teamCount}
                        onChange={e => setForm(f => ({ ...f, teamCount: parseInt(e.target.value) || 1 }))}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '7px 10px',
                          fontSize: 13,
                          boxSizing: 'border-box',
                          background: '#fff',
                        }}
                      />
                    </div>

                    {!isScoreGame ? (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                          STAGES / TEAM
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          required
                          value={form.stagesPerTeam}
                          onChange={e => setForm(f => ({ ...f, stagesPerTeam: parseInt(e.target.value) || 1 }))}
                          style={{
                            width: '100%',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: 13,
                            boxSizing: 'border-box',
                            background: '#fff',
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                          MEMBERS / TEAM
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          required
                          value={form.membersPerTeam}
                          onChange={e => setForm(f => ({ ...f, membersPerTeam: parseInt(e.target.value) || 1 }))}
                          style={{
                            width: '100%',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: 13,
                            boxSizing: 'border-box',
                            background: '#fff',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {!isScoreGame && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155', cursor: 'pointer', marginTop: 6 }}>
                        <input
                          type="checkbox"
                          checked={form.hasCommonFinalQr}
                          onChange={e => setForm(f => ({ ...f, hasCommonFinalQr: e.target.checked }))}
                          style={{ width: 16, height: 16, accentColor: '#FF6B35' }}
                        />
                        <span>Include a <strong>Common Final QR Code</strong> for all teams</span>
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            MAX HINTS / TEAM
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={form.maxHintsPerTeam}
                            onChange={e => setForm(f => ({ ...f, maxHintsPerTeam: parseInt(e.target.value) || 0 }))}
                            style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                            HINT DELAY (MINUTES)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={form.hintDelayMinutes}
                            onChange={e => setForm(f => ({ ...f, hintDelayMinutes: parseInt(e.target.value) || 0 }))}
                            style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.35)',
                  }}
                >
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
