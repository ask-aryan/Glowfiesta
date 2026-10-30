'use client'
import { useState, useRef, useEffect } from 'react'
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
  clueId: number
  eventId: number
  clueText: string | null
  resultNumber: number
  stageNumber: number | null
  isCommonFinal: boolean
}

export default function ClueRowActions({ clueId, eventId, clueText, resultNumber, stageNumber, isCommonFinal }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    clueText: clueText ?? '',
    resultNumber: String(resultNumber),
    stageNumber: stageNumber !== null ? String(stageNumber) : '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditOpen(false)
    }
    if (editOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editOpen])

  async function handleSave() {
    setSaving(true); setErr('')
    const body: Record<string, string | number> = {
      clueText: form.clueText,
      resultNumber: parseInt(form.resultNumber),
    }
    if (!isCommonFinal && form.stageNumber) body.stageNumber = parseInt(form.stageNumber)
    const res = await fetch(`/api/organizer/events/${eventId}/clues/${clueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Failed'); return }
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this clue? If QR codes are already generated, they will also be deleted.')) return
    setDeleting(true)
    const res = await fetch(`/api/organizer/events/${eventId}/clues/${clueId}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Failed to delete'); setDeleting(false); return }
    router.refresh()
  }

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 4, alignItems: 'center' }} ref={ref}>
      <button
        onClick={() => { setForm({ clueText: clueText ?? '', resultNumber: String(resultNumber), stageNumber: stageNumber !== null ? String(stageNumber) : '' }); setEditOpen(v => !v) }}
        title="Edit clue"
        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#475569', display: 'grid', placeItems: 'center' }}
      ><IcEdit /></button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete clue"
        style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#dc2626', display: 'grid', placeItems: 'center' }}
      >{deleting ? '…' : <IcTrash />}</button>

      {editOpen && (
        <div style={{
          position: 'absolute', top: 32, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: 16, width: 300,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Edit Clue</div>
          {err && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CLUE TEXT / VIDEO LINK</label>
            <textarea
              value={form.clueText}
              onChange={e => setForm(f => ({ ...f, clueText: e.target.value }))}
              placeholder="Riddle text or Google Drive / YouTube video URL…"
              rows={3}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 13, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>RESULT #</label>
              <input
                type="number"
                value={form.resultNumber}
                onChange={e => setForm(f => ({ ...f, resultNumber: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}
              />
            </div>
            {!isCommonFinal && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>STAGE #</label>
                <input
                  type="number"
                  value={form.stageNumber}
                  onChange={e => setForm(f => ({ ...f, stageNumber: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}
                />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditOpen(false)} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 0', cursor: 'pointer', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#FF6B35', color: '#fff', border: 0, borderRadius: 6, padding: '7px 0', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
