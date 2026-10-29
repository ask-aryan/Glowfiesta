'use client'
import { useEffect, useState, useCallback } from 'react'

interface TeamProgress {
  teamId: number
  teamName: string
  status: string
  currentStage: number
  lastScanTime: string | null
  awaitingVerification: boolean
  pendingStages: number[]
  completedAt: string | null
}

const COLORS = ['#FF6B35', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b']

export default function ProgressPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId
  const [teams, setTeams] = useState<TeamProgress[]>([])
  const [stagesPerTeam, setStagesPerTeam] = useState(5)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const [verifyInputs, setVerifyInputs] = useState<Record<string, string>>({})
  const [verifyLoading, setVerifyLoading] = useState<Record<string, boolean>>({})
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({})

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/progress`)
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams)
        if (typeof data.stagesPerTeam === 'number') {
          setStagesPerTeam(data.stagesPerTeam)
        }
      }
    } finally { setLoading(false) }
  }, [eventId])

  useEffect(() => {
    fetchProgress()
    const dataInterval = setInterval(fetchProgress, 5000)
    const countInterval = setInterval(() => setCountdown(c => c <= 1 ? 5 : c - 1), 1000)
    return () => { clearInterval(dataInterval); clearInterval(countInterval) }
  }, [fetchProgress])

  async function handleVerify(teamId: number, stageNumber: number) {
    const key = `${teamId}-${stageNumber}`
    const reportedCode = (verifyInputs[key] ?? '').trim().toUpperCase()
    if (reportedCode.length !== 4) { setVerifyMessages(prev => ({ ...prev, [key]: 'Enter the 4-letter code' })); return }
    setVerifyLoading(prev => ({ ...prev, [key]: true }))
    setVerifyMessages(prev => ({ ...prev, [key]: '' }))
    const res = await fetch(`/api/organizer/events/${eventId}/teams/${teamId}/verify-release`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedCode, stageNumber }),
    })
    const data = await res.json()
    setVerifyLoading(prev => ({ ...prev, [key]: false }))
    if (!res.ok) { setVerifyMessages(prev => ({ ...prev, [key]: data.error ?? 'Error' })) }
    else { setVerifyMessages(prev => ({ ...prev, [key]: `✓ Verified! Next stage: ${data.nextStage}` })); setVerifyInputs(prev => ({ ...prev, [key]: '' })); fetchProgress() }
  }

  const sorted = [...teams].sort((a, b) => b.currentStage - a.currentStage)
  const leader = sorted[0]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>Live Progress</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#64748b', fontSize: 13 }}>
          <span>Refreshing in <strong style={{ color: '#0f172a' }}>{countdown}s</strong></span>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#FF6B35', width: `${(countdown / 5) * 100}%`, transition: 'width 1s linear' }} />
          </div>
        </div>
      </div>

      {!loading && teams.length > 0 && (
        <div style={{ display: 'flex', gap: 40, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '14px 8px', marginBottom: 8 }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 11 }}>LEADING</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: '#e8541f' }}>{leader?.teamName ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 11 }}>TEAMS</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{teams.length}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 11 }}>COMPLETED</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{teams.filter(t => t.status === 'COMPLETED').length}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center', color: '#64748b', fontSize: 12 }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e' }} />Completed</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#FF6B35' }} />Current</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#e2e8f0' }} />Locked</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#fef9c3', border: '1px solid #eab308' }} />Awaiting verify</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px 0' }}>Loading…</div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>No teams found</div>
        </div>
      ) : (
        <div>
          {sorted.map((team, idx) => {
            const isLead = idx === 0 && team.currentStage > (sorted[1]?.currentStage ?? -1)
            const color = COLORS[idx % COLORS.length]
            return (
              <div key={team.teamId} style={{
                display: 'grid', gridTemplateColumns: '32px 200px minmax(0,1fr) 200px',
                gap: 18, alignItems: 'center', padding: '16px 8px',
                borderBottom: '1px solid #eef0f3',
                background: team.status === 'COMPLETED' ? '#f0fdf4' : isLead ? '#fff7f2' : 'transparent',
              }}>
                <div style={{ fontWeight: 700, color: idx === 0 ? '#e8541f' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 }}>
                    {team.teamName.trim().slice(0, 2).toUpperCase()}
                  </span>
                  {team.teamName}
                  {isLead && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', background: '#FF6B35', color: '#fff', borderRadius: 999, padding: '2px 7px' }}>LEADING</span>}
                  {team.status === 'COMPLETED' && <span style={{ fontSize: 16 }}>🏆</span>}
                </div>

                <div>
                  <StageBar team={team} stagesPerTeam={stagesPerTeam} />
                </div>

                <div>
                  {team.awaitingVerification && team.pendingStages.map(stageNumber => {
                    const key = `${team.teamId}-${stageNumber}`
                    return (
                      <div key={stageNumber} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#a16207', fontWeight: 600, marginBottom: 4 }}>⏳ Stage {stageNumber} — Enter 4-letter code:</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="text"
                            maxLength={4}
                            style={{ width: 72, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', outline: 'none' }}
                            placeholder="XXXX"
                            value={verifyInputs[key] ?? ''}
                            onChange={e => setVerifyInputs(prev => ({ ...prev, [key]: e.target.value.toUpperCase() }))}
                          />
                          <button
                            onClick={() => handleVerify(team.teamId, stageNumber)}
                            disabled={verifyLoading[key]}
                            style={{ background: '#22c55e', color: '#fff', border: 0, borderRadius: 6, padding: '5px 10px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                          >
                            {verifyLoading[key] ? '…' : 'Verify'}
                          </button>
                        </div>
                        {verifyMessages[key] && <div style={{ fontSize: 12, marginTop: 4, color: verifyMessages[key].startsWith('✓') ? '#15803d' : '#b91c1c' }}>{verifyMessages[key]}</div>}
                      </div>
                    )
                  })}
                  {!team.awaitingVerification && (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                      {team.status === 'COMPLETED' ? <span style={{ color: '#15803d', fontWeight: 600 }}>Finished {team.completedAt ? new Date(team.completedAt).toLocaleTimeString() : ''}</span> : '—'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StageBar({ team, stagesPerTeam }: { team: TeamProgress; stagesPerTeam: number }) {
  const stages = Math.max(1, stagesPerTeam)
  const segs = Array.from({ length: stages }, (_, i) => {
    const stageNum = i + 1
    const done = stageNum < team.currentStage || team.status === 'COMPLETED'
    const cur = stageNum === team.currentStage && team.status !== 'COMPLETED'
    const awaiting = cur && team.awaitingVerification
    return { stageNum, done, cur, awaiting }
  })

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {segs.map(s => (
        <div key={s.stageNum} style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            height: 10, borderRadius: 5,
            background: s.done ? '#22c55e' : s.awaiting ? '#eab308' : s.cur ? '#FF6B35' : '#e2e8f0',
            animation: s.cur && !s.awaiting ? 'glow-seg 1.2s infinite' : 'none',
          }} />
          <div style={{ fontSize: 10, marginTop: 5, color: s.done ? '#15803d' : s.awaiting ? '#a16207' : s.cur ? '#c2410c' : '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            S{s.stageNum}
          </div>
        </div>
      ))}
    </div>
  )
}
