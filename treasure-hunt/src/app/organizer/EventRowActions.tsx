'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditEventModal from './events/[eventId]/EditEventModal'

const IcTrash = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

interface Props {
  eventId: number
  name: string
  description: string | null
  status?: string
  gameType?: string
  teamCount?: number
  stagesPerTeam?: number
  membersPerTeam?: number | null
  hasCommonFinalQr?: boolean
}

export default function EventRowActions({
  eventId,
  name,
  description,
  status = 'DRAFT',
  gameType = 'TREASURE_HUNT',
  teamCount = 5,
  stagesPerTeam = 5,
  membersPerTeam = 4,
  hasCommonFinalQr = true,
}: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete event "${name}"? This will remove all teams, clues, QR codes and progress. This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/organizer/events/${eventId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Failed to delete')
      setDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
      <EditEventModal
        eventId={eventId}
        isIconOnly
        initialData={{
          name,
          description,
          status,
          gameType,
          teamCount,
          stagesPerTeam,
          membersPerTeam,
          hasCommonFinalQr,
        }}
      />
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete event"
        type="button"
        style={{
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '6px 8px',
          cursor: deleting ? 'not-allowed' : 'pointer',
          color: '#dc2626',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {deleting ? '…' : <IcTrash />}
      </button>
    </div>
  )
}
