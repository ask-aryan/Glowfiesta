import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import PlayerMenu from './PlayerMenu'
import ScanQrButton from './ScanQrButton'
import PlayerAutoRefresh from './PlayerAutoRefresh'
import PlayerRefreshButton from './PlayerRefreshButton'

async function getTeamInfo(teamId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      event: { select: { name: true, status: true, stagesPerTeam: true } },
      stageProgress: { orderBy: { stageNumber: 'asc' } },
    },
  })
}

async function getClueForTeamStage(teamId: number, eventId: number, stageNumber: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.clue.findFirst({
    where: { eventId, teamId, stageNumber, isCommonFinal: false },
    select: { id: true, clueText: true, resultCode: true },
  })
}

const STAGE_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started',
  CLUE_ISSUED: 'Clue issued',
  QR_SCANNED: 'QR scanned',
  AWAITING_RECEPTION_VERIFICATION: 'At reception',
  NEXT_CLUE_RELEASED: 'Next clue ready',
  COMPLETED: 'Done',
}

export default async function PlayerPage() {
  const session = await getSession()
  if (!session.userId || session.role !== 'TEAM') redirect('/login')
  const team = session.teamId ? await getTeamInfo(session.teamId) : null

  if (!team) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Team not found.</div>
          <div style={{ color: '#ffd9b8', fontSize: 14 }}>Please contact the organizer.</div>
        </div>
      </div>
    )
  }

  const isLive = team.event.status === 'LIVE'
  const isPaused = team.event.status === 'PAUSED'
  const isCompleted = team.status === 'COMPLETED'

  const currentStageProgress = team.stageProgress.find(p =>
    p.status !== 'COMPLETED' && p.status !== 'NEXT_CLUE_RELEASED'
  ) ?? team.stageProgress[team.stageProgress.length - 1]

  const totalStages = team.event.stagesPerTeam
  const completedCount = team.stageProgress.filter(p => p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED').length

  // Determine if the current stage's clue should be visible:
  // Stage 1 → always visible when live. Stage N → visible only after stage N-1 is NEXT_CLUE_RELEASED.
  const prevStageReleased = currentStageProgress
    ? currentStageProgress.stageNumber === 1
      || team.stageProgress.some(p => p.stageNumber === currentStageProgress.stageNumber - 1 && (p.status === 'NEXT_CLUE_RELEASED' || p.status === 'COMPLETED'))
    : false

  const awaitingVerification = currentStageProgress?.status === 'AWAITING_RECEPTION_VERIFICATION'

  const clueVisible = (isLive || isPaused) && prevStageReleased
    && !awaitingVerification

  const currentClue = (clueVisible || awaitingVerification) && currentStageProgress?.stageNumber
    ? await getClueForTeamStage(team.id, team.eventId, currentStageProgress.stageNumber)
    : null

  return (
    <div style={{ height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
      <PlayerAutoRefresh />
      {isPaused && (
        <div style={{ background: '#f59e0b', color: '#2a1700', textAlign: 'center', fontWeight: 700, padding: '8px 14px', fontSize: 13, animation: 'bannerPulse 2s infinite', flexShrink: 0 }}>
          Hunt is paused — please wait
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 8px', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, paddingRight: 10 }}>
            <PlayerMenu teamName={team.teamName} eventName={team.event.name} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 24, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {team.teamName}
              </div>
              <div style={{ color: '#FF8A57', fontWeight: 600, marginTop: 2, fontSize: 12 }}>
                {team.event.name} · GlowFiesta
              </div>
            </div>
          </div>
          <PlayerRefreshButton />
        </div>

        {isCompleted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28, background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              You finished!
            </div>
            <div style={{ color: '#ffe3cc', marginTop: 8, fontSize: 15 }}>Every stage is complete. Head to the reception desk.</div>
          </div>
        ) : (
          <>
            {/* Current mission card */}
            <div style={{ marginTop: 14, borderRadius: 18, padding: '14px 16px', background: 'rgba(26,5,51,.55)', border: '1.5px solid #FF6B35', animation: 'glow-box 2.6s ease-in-out infinite', opacity: isPaused ? 0.55 : 1, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '.16em', fontWeight: 700, color: '#FFC857' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6B35', animation: isLive ? 'pulse-ring 1.6s infinite' : 'none' }} />
                CURRENT MISSION · STAGE {currentStageProgress?.stageNumber ?? '—'}
              </div>
              {!isLive && !isPaused ? (
                <>
                  <div style={{ fontSize: 11, color: '#ffd9b8', marginTop: 8 }}>Status:</div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 17, lineHeight: 1.3, marginTop: 4, color: '#8b7fa8' }}>
                    Waiting for the hunt to start…
                  </div>
                </>
              ) : awaitingVerification ? (
                <>
                  <div style={{ background: 'rgba(255,200,87,.12)', border: '1.5px solid #FFC857', borderRadius: 14, padding: '12px 14px', marginTop: 8 }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 700, color: '#FFC857' }}>Go to the reception desk!</div>
                    <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 4 }}>Show this 4-letter code to the organizer:</div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: 38,
                      lineHeight: 1.1,
                      letterSpacing: '.18em',
                      color: '#FFC857',
                      background: 'rgba(0,0,0,.45)',
                      borderRadius: 12,
                      padding: '8px 16px',
                      display: 'inline-block',
                      marginTop: 8,
                      border: '1.5px solid rgba(255,200,87,.4)',
                      filter: 'drop-shadow(0 3px 12px rgba(255,200,87,.35))',
                    }}>
                      {currentClue?.resultCode ?? '????'}
                    </div>
                  </div>
                </>
              ) : currentClue ? (
                <>
                  <div style={{ fontSize: 11, color: '#ffd9b8', marginTop: 8 }}>Your clue:</div>
                  <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 14px', borderLeft: '3px solid #FFC857', marginTop: 6 }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 17, lineHeight: 1.35, color: '#fff' }}>
                      {currentClue.clueText || <span style={{ color: '#8b7fa8', fontStyle: 'italic' }}>No clue text — ask the organizer</span>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: '#ffd9b8', marginTop: 8 }}>Status:</div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 17, lineHeight: 1.3, marginTop: 4, color: '#8b7fa8' }}>
                    Waiting for clue to be released…
                  </div>
                </>
              )}
            </div>

            {/* Stage progress stepper */}
            <div style={{ marginTop: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '.16em', fontWeight: 700, color: '#c9a9e8' }}>PROGRESS</span>
                <span style={{ fontSize: 11, color: '#ffd9b8' }}>{completedCount} of {totalStages} complete</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {team.stageProgress.map((p, i) => {
                  const done = p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED'
                  const cur = !done && p.status !== 'NOT_STARTED'
                  const last = i === team.stageProgress.length - 1
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', flex: last ? 0 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 30 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                          fontWeight: 700, fontSize: 12,
                          background: done ? '#22c55e' : cur ? '#FF6B35' : 'rgba(255,255,255,.08)',
                          color: done || cur ? '#fff' : '#8b7fa8',
                          animation: cur && isLive ? 'pulse-ring 1.6s infinite' : 'none',
                          border: done || cur ? '2px solid transparent' : '2px solid rgba(255,255,255,.14)',
                        }}>
                          {done ? '✓' : p.stageNumber}
                        </div>
                        <div style={{ fontSize: 9, color: done ? '#86efac' : cur ? '#FFC857' : '#8b7fa8', fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}>
                          {STAGE_STATUS_LABEL[p.status] ?? p.status}
                        </div>
                      </div>
                      {!last && <div style={{ flex: 1, height: 2.5, borderRadius: 2, margin: '12px 3px 0', background: done ? '#22c55e' : 'rgba(255,255,255,.14)' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {!isCompleted && (
        <div style={{ padding: '8px 20px calc(14px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }}>
          {awaitingVerification ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', height: 52, borderRadius: 16,
                fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '.04em',
                color: '#FFC857', background: 'rgba(255,200,87,.14)', border: '1.5px solid rgba(255,200,87,.4)',
              }}
            >
              ⏳ AT RECEPTION DESK
            </div>
          ) : (
            <ScanQrButton isLive={isLive} isPaused={isPaused} />
          )}
        </div>
      )}
    </div>
  )
}
