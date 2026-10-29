'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const IcEdit = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcTrash = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

interface Props {
  teamId: number
  eventId: number
  teamName: string
  leaderName?: string | null
  members?: string | null
  isScoreGame?: boolean
}

export default function TeamRowActions({
  teamId,
  eventId,
  teamName,
  leaderName = '',
  members = '',
  isScoreGame = false,
}: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    teamName,
    leaderName: leaderName || '',
    members: members || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditOpen(false)
    }
    if (editOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [editOpen])

  function openEditModal() {
    setForm({
      teamName,
      leaderName: leaderName || '',
      members: members || '',
      password: '',
    })
    setErr('')
    setEditOpen(true)
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!form.teamName.trim()) {
      setErr('Team name cannot be empty')
      return
    }

    setSaving(true)
    setErr('')

    const body: Record<string, string> = {}
    if (form.teamName.trim() !== teamName) body.teamName = form.teamName.trim()
    if ((form.leaderName || '') !== (leaderName || '')) body.leaderName = form.leaderName.trim()
    if ((form.members || '') !== (members || '')) body.members = form.members.trim()
    if (form.password) body.password = form.password

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSaving(false)
      if (!res.ok) {
        const d = await res.json()
        setErr(d.error ?? 'Failed to update team')
        return
      }
      setEditOpen(false)
      router.refresh()
    } catch {
      setSaving(false)
      setErr('Network error. Please try again.')
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete team "${teamName}"? This will remove their login, progress, and QR codes.`)) return
    setDeleting(true)
    const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Failed to delete')
      setDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
      <button
        onClick={openEditModal}
        type="button"
        title="Edit team"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '6px 8px',
          cursor: 'pointer',
          color: '#475569',
          display: 'grid',
          placeItems: 'center',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <IcEdit />
      </button>

      <button
        onClick={handleDelete}
        type="button"
        disabled={deleting}
        title="Delete team"
        style={{
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '6px 8px',
          cursor: deleting ? 'not-allowed' : 'pointer',
          color: '#dc2626',
          display: 'grid',
          placeItems: 'center',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {deleting ? '…' : <IcTrash />}
      </button>

      {/* Centered Fixed Modal: immune to table overflow:hidden or card clipping */}
      {editOpen && (
        <div
          onClick={() => setEditOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
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
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              padding: '24px 26px',
              width: '100%',
              maxWidth: 420,
              boxSizing: 'border-box',
              animation: 'pop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Edit Team</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Update team details and credentials</div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
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

            {err && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
                {err}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                  TEAM NAME *
                </label>
                <input
                  type="text"
                  required
                  value={form.teamName}
                  onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
                  placeholder="e.g. Red Warriors"
                  style={{
                    width: '100%',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {!isScoreGame && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                    NEW PASSWORD <span style={{ fontWeight: 400, color: '#94a3b8' }}>(leave blank to keep)</span>
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter new plain password"
                    style={{
                      width: '100%',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                  TEAM LEADER <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.leaderName}
                  onChange={e => setForm(f => ({ ...f, leaderName: e.target.value }))}
                  placeholder="Leader name"
                  style={{
                    width: '100%',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#475569', display: 'block', marginBottom: 5 }}>
                  MEMBERS <span style={{ fontWeight: 400, color: '#94a3b8' }}>(comma-separated, optional)</span>
                </label>
                <input
                  type="text"
                  value={form.members}
                  onChange={e => setForm(f => ({ ...f, members: e.target.value }))}
                  placeholder="e.g. John, Sarah, Alex"
                  style={{
                    width: '100%',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  style={{
                    flex: 1,
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '10px 0',
                    cursor: 'pointer',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1.3,
                    background: 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '10px 0',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
                    opacity: saving ? 0.75 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
