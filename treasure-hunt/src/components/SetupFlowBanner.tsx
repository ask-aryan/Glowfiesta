'use client'
import Link from 'next/link'

interface Props {
  currentStep: 'teams' | 'clues' | 'qr'
  eventId: number
  gameType?: string
  teamsCount: number
  targetTeams?: number
  cluesCount?: number
  targetClues?: number
  qrCount?: number
  eventStatus?: string
}

export default function SetupFlowBanner({
  currentStep,
  eventId,
  gameType = 'TREASURE_HUNT',
  teamsCount,
  targetTeams = 5,
  cluesCount = 0,
  targetClues = 0,
  qrCount = 0,
  eventStatus = 'DRAFT',
}: Props) {
  const isScoreGame = gameType === 'QUIZ' || gameType === 'FUNTAKSHARI'

  if (isScoreGame) {
    if (currentStep === 'teams') {
      return (
        <div
          style={{
            marginTop: 32,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1.5px solid #86efac',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#22c55e',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              2/2
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#16a34a', textTransform: 'uppercase' }}>
                Setup Flow — Teams Configured ({teamsCount} / {targetTeams})
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginTop: 1 }}>
                Once your teams are entered, proceed to the live scorekeeper to begin scoring!
              </div>
            </div>
          </div>

          <Link
            href={`/organizer/events/${eventId}/scores`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⭐ Open Scorekeeper</span>
            <span style={{ fontSize: 16 }}>&rarr;</span>
          </Link>
        </div>
      )
    }
    return null
  }

  // Treasure Hunt Guided Flow: Teams (2) -> Clues (3) -> QR (4) -> Ready
  return (
    <div
      style={{
        marginTop: 32,
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
        border: '1.5px solid #fed7aa',
        borderRadius: 14,
        padding: '16px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 4px 18px rgba(255, 107, 53, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
          }}
        >
          {currentStep === 'teams' ? '2/4' : currentStep === 'clues' ? '3/4' : '4/4'}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#c2410c', textTransform: 'uppercase' }}>
            {currentStep === 'teams' && `Setup Flow — Step 2: Add Teams (${teamsCount} / ${targetTeams})`}
            {currentStep === 'clues' && `Setup Flow — Step 3: Write Clues (${cluesCount} / ${targetClues || 'all'} completed)`}
            {currentStep === 'qr' && `Setup Flow — Step 4: QR Codes (${qrCount} generated)`}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
            {currentStep === 'teams' && 'Teams registered. Next, enter riddles & clue codes for each team and stage.'}
            {currentStep === 'clues' && 'Clues configured. Next, generate the printable QR code sheet with verification tokens.'}
            {currentStep === 'qr' && 'QR codes are ready to print. Return to Event Overview to review and mark the event READY!'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {currentStep === 'clues' && (
          <Link
            href={`/organizer/events/${eventId}/teams`}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: 12.5,
              textDecoration: 'none',
            }}
          >
            &larr; Back to Teams
          </Link>
        )}

        {currentStep === 'qr' && (
          <Link
            href={`/organizer/events/${eventId}/clues`}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: 12.5,
              textDecoration: 'none',
            }}
          >
            &larr; Back to Clues
          </Link>
        )}

        {currentStep === 'teams' && (
          <Link
            href={`/organizer/events/${eventId}/clues`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(255, 107, 53, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Next: Write Clues & Riddles</span>
            <span style={{ fontSize: 16 }}>&rarr;</span>
          </Link>
        )}

        {currentStep === 'clues' && (
          <Link
            href={`/organizer/events/${eventId}/qr`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FFA23A 0%, #FF6B35 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(255, 107, 53, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Next: Generate QR Codes</span>
            <span style={{ fontSize: 16 }}>&rarr;</span>
          </Link>
        )}

        {currentStep === 'qr' && (
          <Link
            href={`/organizer/events/${eventId}?step=ready`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Next: Review & Mark Event Ready</span>
            <span style={{ fontSize: 16 }}>&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  )
}
