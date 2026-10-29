import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import PlayerLogout from './PlayerLogout'

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
    select: { id: true, clueText: true },
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

  const clueVisible = (isLive || isPaused) && prevStageReleased
    && currentStageProgress?.status !== 'AWAITING_RECEPTION_VERIFICATION'

  const currentClue = clueVisible && currentStageProgress?.stageNumber
    ? await getClueForTeamStage(team.id, team.eventId, currentStageProgress.stageNumber)
    : null

  const awaitingVerification = currentStageProgress?.status === 'AWAITING_RECEPTION_VERIFICATION'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg,#1a0533,#3d1a00,#FF6B35 200%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15 }}>
      {isPaused && (
        <div style={{ background: '#f59e0b', color: '#2a1700', textAlign: 'center', fontWeight: 700, padding: '12px 16px', fontSize: 14, animation: 'bannerPulse 2s infinite' }}>
          Hunt is paused — please wait
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '30px 24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 34, lineHeight: 1.05 }}>{team.teamName}</div>
            <div style={{ color: '#FF8A57', fontWeight: 600, marginTop: 4, fontSize: 14 }}>{team.event.name} · GlowFiesta 2026</div>
          </div>
          <PlayerLogout />
        </div>

        {isCompleted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>🏆</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 32, background: 'linear-gradient(180deg,#fff0b3,#FFC857 55%,#e8962a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              You finished!
            </div>
            <div style={{ color: '#ffe3cc', marginTop: 10, fontSize: 16 }}>Every stage is complete. Head to the reception desk.</div>
          </div>
        ) : (
          <>
            {/* Current mission */}
            <div style={{ marginTop: 28, borderRadius: 24, padding: 22, background: 'rgba(26,5,51,.55)', border: '1.5px solid #FF6B35', animation: 'glow-box 2.6s ease-in-out infinite', opacity: isPaused ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '.18em', fontWeight: 600, color: '#FFC857' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', animation: isLive ? 'pulse-ring 1.6s infinite' : 'none' }} />
                CURRENT MISSION · STAGE {currentStageProgress?.stageNumber ?? '—'}
              </div>
              {!isLive && !isPaused ? (
                <>
                  <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 14 }}>Status:</div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 20, lineHeight: 1.3, marginTop: 6, color: '#8b7fa8' }}>
                    Waiting for the hunt to start…
                  </div>
                </>
              ) : awaitingVerification ? (
                <>
                  <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 14 }}>Status:</div>
                  <div style={{ background: 'rgba(255,200,87,.12)', border: '1.5px solid #FFC857', borderRadius: 14, padding: '14px 16px', marginTop: 10 }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 19, fontWeight: 600, color: '#FFC857' }}>Go to the reception desk!</div>
                    <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 6 }}>Show the 4-letter code you received to the organizer.</div>
                  </div>
                </>
              ) : currentClue ? (
                <>
                  <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 14 }}>Your clue:</div>
                  <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 16px', borderLeft: '3px solid #FFC857', marginTop: 10 }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 20, lineHeight: 1.4, color: '#fff' }}>
                      {currentClue.clueText || <span style={{ color: '#8b7fa8', fontStyle: 'italic' }}>No clue text — ask the organizer</span>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 14 }}>Status:</div>
                  <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 500, fontSize: 20, lineHeight: 1.3, marginTop: 6, color: '#8b7fa8' }}>
                    Waiting for clue to be released…
                  </div>
                </>
              )}
            </div>

            {/* Stage progress stepper */}
            <div style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 11, letterSpacing: '.18em', fontWeight: 600, color: '#c9a9e8' }}>PROGRESS</span>
                <span style={{ fontSize: 12, color: '#ffd9b8' }}>{completedCount} of {totalStages} complete</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {team.stageProgress.map((p, i) => {
                  const done = p.status === 'COMPLETED' || p.status === 'NEXT_CLUE_RELEASED'
                  const cur = !done && p.status !== 'NOT_STARTED'
                  const last = i === team.stageProgress.length - 1
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', flex: last ? 0 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 34 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center',
                          fontWeight: 700, fontSize: 14,
                          background: done ? '#22c55e' : cur ? '#FF6B35' : 'rgba(255,255,255,.08)',
                          color: done || cur ? '#fff' : '#8b7fa8',
                          animation: cur && isLive ? 'pulse-ring 1.6s infinite' : 'none',
                          border: done || cur ? '2px solid transparent' : '2px solid rgba(255,255,255,.14)',
                        }}>
                          {done ? '✓' : p.stageNumber}
                        </div>
                        <div style={{ fontSize: 10, color: done ? '#86efac' : cur ? '#FFC857' : '#8b7fa8', fontWeight: 600, textAlign: 'center' }}>
                          {STAGE_STATUS_LABEL[p.status] ?? p.status}
                        </div>
                      </div>
                      {!last && <div style={{ flex: 1, height: 3, borderRadius: 2, margin: '15px 4px 0', background: done ? '#22c55e' : 'rgba(255,255,255,.14)' }} />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 20 }} />
          </>
        )}
      </div>

      {!isCompleted && (
        <div style={{ padding: '12px 24px 32px' }}>
          <Link
            href="/player/scan"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              width: '100%', height: 64, border: 'none', borderRadius: 20,
              fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 21, letterSpacing: '.08em',
              color: '#fff', textDecoration: 'none',
              background: isLive ? 'linear-gradient(135deg,#FFA23A,#FF6B35 60%,#e8431a)' : 'rgba(255,255,255,.15)',
              boxShadow: isLive ? '0 8px 28px rgba(255,107,53,.5)' : 'none',
              opacity: isPaused ? 0.45 : 1,
              pointerEvents: (isPaused || !isLive) ? 'none' : 'auto',
            }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
            </svg>
            {isPaused ? 'PAUSED' : isLive ? 'SCAN QR' : 'HUNT NOT STARTED'}
          </Link>
        </div>
      )}
    </div>
  )
}
