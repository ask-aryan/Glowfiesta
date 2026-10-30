'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Clue { id: number; clueText: string | null; hintText?: string | null; resultCode: string }

interface Props {
  clue: Clue | null
  eventId: number
  teamId: number | null
  stageNumber: number | null
  isCommonFinal?: boolean
}

export default function ClueCell({ clue, eventId, teamId, stageNumber, isCommonFinal }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(clue?.clueText ?? '')
  const [hint, setHint] = useState(clue?.hintText ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    setSaving(true); setErr('')
    let res: Response
    if (clue) {
      res = await fetch(`/api/organizer/events/${eventId}/clues/${clue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clueText: text, hintText: hint }),
      })
    } else {
      res = await fetch(`/api/organizer/events/${eventId}/clues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: teamId ?? undefined,
          stageNumber: stageNumber ?? undefined,
          clueText: text,
          hintText: hint,
          isCommonFinal: isCommonFinal ?? false,
        }),
      })
    }
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Failed'); return }
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!clue) return
    if (!confirm('Delete this clue?')) return
    setDeleting(true)
    await fetch(`/api/organizer/events/${eventId}/clues/${clue.id}`, { method: 'DELETE' })
    setDeleting(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div style={{ background: '#fff', border: '1.5px solid #FF6B35', borderRadius: 10, padding: 10 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
          CLUE TEXT
        </label>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter clue text…"
          rows={3}
          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#b45309', marginTop: 8, marginBottom: 4 }}>
          💡 HINT FOR RECEPTION (OPTIONAL)
        </label>
        <textarea
          value={hint}
          onChange={e => setHint(e.target.value)}
          placeholder="Enter hint to be shown to organizers at reception desk when team asks for help…"
          rows={2}
          style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 8px', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fefce8' }}
        />

        {err && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#FF6B35', color: '#fff', border: 0, borderRadius: 6, padding: '6px 0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setText(clue?.clueText ?? ''); setHint(clue?.hintText ?? '') }} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 0, borderRadius: 6, padding: '6px 0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!clue) {
    return (
      <button
        onClick={() => { setText(''); setHint(''); setEditing(true) }}
        style={{ width: '100%', minHeight: 72, border: '1.5px dashed #e2e8f0', borderRadius: 10, background: '#fafafa', color: '#94a3b8', cursor: 'pointer', fontSize: 22, display: 'grid', placeItems: 'center', transition: 'border-color .15s, background .15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#FF6B35'; (e.currentTarget as HTMLElement).style.background = '#fff7f2'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
      >
        +
      </button>
    )
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#fff', position: 'relative', minHeight: 72 }}>
      <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.4, marginBottom: 8, paddingRight: 48 }}>
        {clue.clueText ? (
          <div>
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {clue.clueText}
            </span>
            {/drive\.google\.com|youtube\.com|youtu\.be|\.(mp4|webm|mov|png|jpg|jpeg)/i.test(clue.clueText) && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 4,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#FF6B35',
                  background: '#fff1ea',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                🎬 Video / Media Clue
              </span>
            )}
            {clue.hintText && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: '#854d0e',
                  background: '#fef9c3',
                  padding: '3px 8px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>💡</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  Hint: {clue.hintText}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No text — click to add</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, letterSpacing: '.12em', color: '#FF6B35', background: '#fff1ea', borderRadius: 6, padding: '2px 8px' }}>
          {clue.resultCode}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { setText(clue.clueText ?? ''); setHint(clue.hintText ?? ''); setEditing(true) }} title="Edit" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', fontSize: 11, color: '#475569' }}>Edit</button>
          <button onClick={handleDelete} disabled={deleting} title="Delete" style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>{deleting ? '…' : 'Del'}</button>
        </div>
      </div>
    </div>
  )
}
