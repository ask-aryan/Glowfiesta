import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import PlayerMenu from './PlayerMenu'
import ScanQrButton from './ScanQrButton'
import PlayerAutoRefresh from './PlayerAutoRefresh'
import PlayerRefreshButton from './PlayerRefreshButton'
import RichClueDisplay from '@/components/RichClueDisplay'
import HintCard from './HintCard'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function getTeamInfo(teamId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      event: {
        select: {
          name: true,
          status: true,
          stagesPerTeam: true,
          hasCommonFinalQr: true,
          maxHintsPerTeam: true,
          hintDelayMinutes: true,
          startsAt: true,
        },
      },
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

async function getCommonFinalClue(eventId: number) {
  const { prisma } = await import('@/lib/db')
  return prisma.clue.findFirst({
    where: { eventId, isCommonFinal: true },
    select: { id: true, clueText: true },
  })
}

async function getCompletedWinners(eventId: number, currentTeamId: number) {
  const { prisma } = await import('@/lib/db')
  const teams = await prisma.team.findMany({
    where: { eventId, status: 'COMPLETED' },
    select: {
      id: true,
      teamName: true,
      updatedAt: true,
      stageProgress: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { completedAt: true },
      },
    },
  })

  return teams
    .map(t => ({
      id: t.id,
      teamName: t.teamName,
      isCurrentTeam: t.id === currentTeamId,
      completedAt: t.stageProgress[0]?.completedAt ?? t.updatedAt,
    }))
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
    .map((t, idx) => ({ ...t, place: idx + 1 }))
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
  const isEventCompleted = team.event.status === 'COMPLETED'
  const isCompleted = team.status === 'COMPLETED'

  const winners = await getCompletedWinners(team.eventId, team.id)
  const otherWinners = winners.filter(w => !w.isCurrentTeam)
  const currentTeamWin = winners.find(w => w.isCurrentTeam)

  const totalStages = team.event.stagesPerTeam
  const completedCount = team.stageProgress.filter(
    p => p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED'
  ).length

  // All team stages (1..totalStages) have been verified and completed
  const allStagesCompleted =
    team.stageProgress.length >= totalStages &&
    team.stageProgress.every(
      p => p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED'
    )

  // In the common final clue stage when all team stages are verified and event is not yet finished
  const isFinalClueStage = allStagesCompleted && !isCompleted

  const currentStageProgress = isFinalClueStage
    ? null
    : (team.stageProgress.find(p => p.status !== 'COMPLETED' && p.status !== 'NEXT_CLUE_RELEASED') ?? team.stageProgress[team.stageProgress.length - 1])

  const awaitingVerification = currentStageProgress?.status === 'AWAITING_RECEPTION_VERIFICATION'

  // Determine if the current stage's clue should be visible:
  // Stage 1 → always visible when live. Stage N → visible only after stage N-1 is NEXT_CLUE_RELEASED.
  const prevStageReleased = currentStageProgress
    ? currentStageProgress.stageNumber === 1
      || team.stageProgress.some(p => p.stageNumber === currentStageProgress.stageNumber - 1 && (p.status === 'NEXT_CLUE_RELEASED' || p.status === 'COMPLETED'))
    : false

  const clueVisible = (isLive || isPaused) && prevStageReleased
    && !awaitingVerification

  const currentClue = (clueVisible || awaitingVerification) && currentStageProgress?.stageNumber
    ? await getClueForTeamStage(team.id, team.eventId, currentStageProgress.stageNumber)
    : null

  const finalClue = isFinalClueStage ? await getCommonFinalClue(team.eventId) : null

  // Hints eligibility: final and final-1 stages do not get hints
  const isEligibleStage = Boolean(
    !isFinalClueStage &&
    currentStageProgress &&
    (team.event.hasCommonFinalQr
      ? currentStageProgress.stageNumber <= totalStages - 1
      : currentStageProgress.stageNumber <= totalStages - 2)
  )

  const prevStageProgress = currentStageProgress
    ? team.stageProgress.find(p => p.stageNumber === currentStageProgress.stageNumber - 1)
    : null

  const stageStartTime =
    currentStageProgress?.stageStartedAt ??
    (currentStageProgress?.stageNumber === 1
      ? (team.event.startsAt ?? team.createdAt)
      : prevStageProgress?.nextClueReleasedAt ?? team.createdAt)

  const totalHintsUsed = team.stageProgress.filter(p => p.usedHint).length

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
            <div style={{ fontSize: 64, marginBottom: 12 }}>
              {currentTeamWin?.place === 1 ? '🥇' : currentTeamWin?.place === 2 ? '🥈' : currentTeamWin?.place === 3 ? '🥉' : '🏆'}
            </div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28, background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {currentTeamWin ? `You finished in ${currentTeamWin.place === 1 ? '1st' : currentTeamWin.place === 2 ? '2nd' : currentTeamWin.place === 3 ? '3rd' : `${currentTeamWin.place}th`} Place!` : 'You finished!'}
            </div>
            <div style={{ color: '#ffe3cc', marginTop: 8, fontSize: 15 }}>Every stage is complete. Head to the reception desk.</div>
          </div>
        ) : isEventCompleted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏁</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 28, background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Hunt Concluded
            </div>
            <div style={{ color: '#ffd9b8', marginTop: 8, fontSize: 15, maxWidth: 320, lineHeight: 1.4 }}>
              The organizer has marked this event as completed. All stages and clue scanning are closed.
            </div>

            {/* Winners Standings */}
            {winners.length > 0 && (
              <div style={{ marginTop: 22, width: '100%', maxWidth: 340, background: 'rgba(255,200,87,0.1)', border: '1.5px solid rgba(255,200,87,0.3)', borderRadius: 16, padding: '16px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#FFC857', textTransform: 'uppercase', marginBottom: 10, textAlign: 'left' }}>
                  Final Standings 🏆
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {winners.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{w.place === 1 ? '🥇' : w.place === 2 ? '🥈' : w.place === 3 ? '🥉' : `#${w.place}`}</span>
                        <span style={{ fontWeight: 700, color: w.isCurrentTeam ? '#FFC857' : '#fff' }}>{w.teamName}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>Winner</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Final Treasure Found Announcement */}
            {otherWinners.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  padding: '9px 12px',
                  background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.25) 0%, rgba(255, 200, 87, 0.2) 100%)',
                  border: '1.5px solid #FFC857',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 0 16px rgba(255, 200, 87, 0.25)',
                  animation: 'glow-box 2.4s infinite ease-in-out',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>🏆</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#FFC857', textTransform: 'uppercase' }}>
                    Final Treasure Discovered!
                  </div>
                  <div style={{ fontSize: 12.5, color: '#fff', fontWeight: 600, marginTop: 1, lineHeight: 1.25 }}>
                    {otherWinners.length === 1 ? (
                      <>
                        <span style={{ color: '#FFC857', fontWeight: 700 }}>{otherWinners[0].teamName}</span> has found the Final Treasure! 🎯 Race on for runner-up!
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#FFC857', fontWeight: 700 }}>{otherWinners[0].teamName}</span> (1st) &amp;{' '}
                        <span style={{ color: '#FFC857', fontWeight: 700 }}>{otherWinners.slice(1).map(w => w.teamName).join(', ')}</span> have found the Final Treasure! 🎯
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Current mission card */}
            <div style={{
              marginTop: 12,
              borderRadius: 18,
              padding: '14px 16px',
              background: isFinalClueStage ? 'rgba(38, 12, 60, 0.75)' : 'rgba(26,5,51,.55)',
              border: isFinalClueStage ? '1.5px solid #FFC857' : '1.5px solid #FF6B35',
              boxShadow: isFinalClueStage ? '0 0 24px rgba(255,200,87,0.25)' : undefined,
              animation: 'glow-box 2.6s ease-in-out infinite',
              opacity: isPaused ? 0.55 : 1,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '.16em', fontWeight: 700, color: '#FFC857' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: isFinalClueStage ? '#FFC857' : '#FF6B35', animation: isLive ? 'pulse-ring 1.6s infinite' : 'none' }} />
                {isFinalClueStage ? '🌟 FINAL MISSION · THE FINAL TREASURE' : `CURRENT MISSION · STAGE ${currentStageProgress?.stageNumber ?? '—'}`}
              </div>
              {!isLive && !isPaused ? (
                <>
                  <div style={{ fontSize: 11, color: '#ffd9b8', marginTop: 8 }}>Status:</div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 17, lineHeight: 1.3, marginTop: 4, color: '#8b7fa8' }}>
                    {team.event.status === 'READY' ? 'Starting soon! Get ready at the start line…' : 'Waiting for the hunt to start…'}
                  </div>
                </>
              ) : isFinalClueStage ? (
                <>
                  <div style={{ fontSize: 11, color: '#ffd9b8', marginTop: 8 }}>Your final clue:</div>
                  <div style={{ background: 'rgba(255,200,87,.12)', borderRadius: 12, padding: '12px 14px', borderLeft: '3px solid #FFC857', marginTop: 6, maxHeight: 'min(440px, 48vh)', overflowY: 'auto' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 16, lineHeight: 1.35, color: '#fff' }}>
                      <RichClueDisplay
                        text={finalClue?.clueText}
                        fallbackText="Find the common final QR code to complete the hunt and claim victory!"
                      />
                    </div>
                  </div>
                  {otherWinners.length > 0 && (
                    <div style={{
                      marginTop: 8,
                      padding: '7px 10px',
                      borderRadius: 10,
                      background: 'rgba(255, 107, 53, 0.25)',
                      border: '1px solid rgba(255, 200, 87, 0.45)',
                      fontSize: 12,
                      color: '#ffd9b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span>⚡</span>
                      <span>
                        <strong style={{ color: '#FFC857' }}>{otherWinners[0].teamName}</strong> found the Final Treasure first! Hurry to claim {otherWinners.length === 1 ? '2nd' : `${otherWinners.length + 1}th`} place!
                      </span>
                    </div>
                  )}
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
                  <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 12, padding: '10px 14px', borderLeft: '3px solid #FFC857', marginTop: 6, maxHeight: 'min(440px, 48vh)', overflowY: 'auto' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 16, lineHeight: 1.35, color: '#fff' }}>
                      <RichClueDisplay
                        text={currentClue.clueText}
                        fallbackText="No clue text — ask the organizer"
                      />
                    </div>
                  </div>

                  {isEligibleStage && currentStageProgress && (
                    <HintCard
                      stageNumber={currentStageProgress.stageNumber}
                      isEligibleStage={isEligibleStage}
                      usedHintOnThisStage={Boolean(currentStageProgress.usedHint)}
                      hintsUsedTotal={totalHintsUsed}
                      maxHints={team.event.maxHintsPerTeam ?? 2}
                      hintDelayMinutes={team.event.hintDelayMinutes ?? 5}
                      stageStartTimeIso={new Date(stageStartTime).toISOString()}
                      teamName={team.teamName}
                    />
                  )}
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
                <span style={{ fontSize: 11, color: '#ffd9b8' }}>
                  {isFinalClueStage ? 'All stages complete · Final Clue' : `${completedCount} of ${totalStages} complete`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {team.stageProgress.map((p) => {
                  const done = p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED'
                  const cur = !done && p.status !== 'NOT_STARTED'
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
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
                      <div style={{ flex: 1, height: 2.5, borderRadius: 2, margin: '12px 3px 0', background: done ? '#22c55e' : 'rgba(255,255,255,.14)' }} />
                    </div>
                  )
                })}

                {/* Final Step Node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 32 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontWeight: 700, fontSize: 13,
                    background: isCompleted ? '#22c55e' : isFinalClueStage ? 'linear-gradient(135deg, #FFA23A, #FF6B35)' : 'rgba(255,255,255,.08)',
                    color: '#fff',
                    animation: isFinalClueStage && isLive ? 'pulse-ring 1.6s infinite' : 'none',
                    border: isFinalClueStage ? '2px solid #FFC857' : isCompleted ? '2px solid #22c55e' : '2px solid rgba(255,255,255,.14)',
                    boxShadow: isFinalClueStage ? '0 0 12px rgba(255,200,87,0.5)' : undefined,
                  }}>
                    {isCompleted ? '✓' : '🏆'}
                  </div>
                  <div style={{ fontSize: 9, color: isCompleted ? '#86efac' : isFinalClueStage ? '#FFC857' : '#8b7fa8', fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}>
                    {isCompleted ? 'Done' : isFinalClueStage ? 'Final' : 'Locked'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!isCompleted && !isEventCompleted && (
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
            <ScanQrButton isLive={isLive} isPaused={isPaused} eventStatus={team.event.status} isFinal={isFinalClueStage} />
          )}
        </div>
      )}
    </div>
  )
}
