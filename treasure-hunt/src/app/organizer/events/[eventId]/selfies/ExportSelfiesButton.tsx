'use client'
import { useState } from 'react'

interface SelfieItem {
  id: number
  stageNumber: number | null
  imageData: string
  takenAt: Date | string
  team: {
    teamName: string
  }
}

interface Props {
  selfies: SelfieItem[]
  eventName: string
}

export default function ExportSelfiesButton({ selfies, eventName }: Props) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (selfies.length === 0 || exporting) return
    setExporting(true)

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Track duplicate filenames
      const nameCounts: Record<string, number> = {}

      selfies.forEach((s) => {
        const raw = s.imageData || ''
        const match = raw.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
        const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg'
        const base64Data = match ? match[2] : raw.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '')

        const cleanTeam = s.team?.teamName ? s.team.teamName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Team'
        const stageLabel = s.stageNumber ? `Stage_${s.stageNumber}` : 'Final'
        const baseName = `${cleanTeam}_${stageLabel}`

        nameCounts[baseName] = (nameCounts[baseName] || 0) + 1
        const filename = nameCounts[baseName] === 1 ? `${baseName}.${ext}` : `${baseName}_${nameCounts[baseName]}.${ext}`

        zip.file(filename, base64Data, { base64: true })
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const safeEventName = eventName ? eventName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Event'

      const link = document.createElement('a')
      link.href = url
      link.download = `${safeEventName}_Selfies.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export selfies ZIP:', err)
      alert('Failed to generate selfies ZIP archive. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (selfies.length === 0) return null

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 16px',
        borderRadius: 10,
        background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
        color: '#fff',
        border: 0,
        fontWeight: 700,
        fontSize: 13,
        cursor: exporting ? 'not-allowed' : 'pointer',
        boxShadow: exporting ? 'none' : '0 4px 14px rgba(255,107,53,0.35)',
        transition: 'transform 0.1s ease, filter 0.15s ease',
      }}
    >
      {exporting ? (
        <>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              animation: 'spin 0.75s linear infinite',
              display: 'inline-block',
            }}
          />
          <span>Packaging ZIP…</span>
        </>
      ) : (
        <>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export All Selfies (ZIP)</span>
        </>
      )}
    </button>
  )
}
