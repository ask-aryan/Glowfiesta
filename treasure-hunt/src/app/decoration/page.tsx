'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import {
  DecorationEventState,
  DecorationTeam,
  DecorationCriteria,
} from '@/lib/decoration'

export default function AudienceDecorationVotingPage() {
  const [data, setData] = useState<DecorationEventState | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTeamIdx, setActiveTeamIdx] = useState(0)

  // Scores state: { [teamId]: { [criteriaId]: scoreNumber } }
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Check if previously submitted on this device
  useEffect(() => {
    if (typeof window === 'undefined') return
    const submitted = localStorage.getItem('decoration_ballot_submitted') === 'true'
    if (submitted) setHasSubmitted(true)
    const saved = localStorage.getItem('decoration_saved_draft_scores')
    if (saved) {
      try {
        setScores(JSON.parse(saved))
      } catch {}
    }
  }, [])

  // Poll state every 2 seconds
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const res = await fetch(`/api/decoration?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (isMounted && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {}
    }
    loadData()
    const timer = setInterval(loadData, 2000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  // Score Setter
  function handleSetScore(teamId: string, critId: string, val: number) {
    if (data?.status !== 'ACTIVE') return
    setScores(prev => {
      const nextTeamScores = { ...(prev[teamId] || {}), [critId]: val }
      const next = { ...prev, [teamId]: nextTeamScores }
      if (typeof window !== 'undefined') {
        localStorage.setItem('decoration_saved_draft_scores', JSON.stringify(next))
      }
      return next
    })
  }

  // Check if a team has all factors scored
  function isTeamComplete(team: DecorationTeam, criteriaList: DecorationCriteria[]) {
    const tScores = scores[team.id]
    if (!tScores) return false
    return criteriaList.every(c => typeof tScores[c.id] === 'number' && tScores[c.id] > 0)
  }

  // Submit All Decoration Scores
  async function handleSubmitBallot() {
    if (!data || data.status !== 'ACTIVE' || submitting) return
    setErrorMsg('')

    // Verify all teams are scored
    const criteriaList = data.criteria || []
    const incompleteTeams = data.teams.filter(t => !isTeamComplete(t, criteriaList))

    if (incompleteTeams.length > 0) {
      setErrorMsg(
        `Please score all factors for ${incompleteTeams.map(t => `Team #${t.teamNumber} (${t.name})`).join(', ')} before submitting.`
      )
      // Switch active tab to the first incomplete team
      const firstIncompleteIdx = data.teams.findIndex(t => t.id === incompleteTeams[0].id)
      if (firstIncompleteIdx !== -1) setActiveTeamIdx(firstIncompleteIdx)
      return
    }

    setSubmitting(true)

    // Device identification (one vote per device)
    let voterHash = ''
    if (typeof window !== 'undefined') {
      voterHash = localStorage.getItem('decoration_device_id') || ''
      if (!voterHash) {
        voterHash = `dev_dec_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`
        localStorage.setItem('decoration_device_id', voterHash)
      }
    }

    try {
      const res = await fetch('/api/decoration/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterHash,
          scores,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setHasSubmitted(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('decoration_ballot_submitted', 'true')
        }
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFC857', '#FFA23A', '#a855f7', '#22c55e', '#38bdf8'],
        })
      } else {
        setErrorMsg(json.message || 'Failed to submit ballot.')
      }
    } catch {
      setErrorMsg('Network error while submitting ballot. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const teams = data?.teams || []
  const criteria = data?.criteria || []
  const currentTeam = teams[activeTeamIdx] || teams[0] || null
  const completedCount = teams.filter(t => isTeamComplete(t, criteria)).length
  const allTeamsCompleted = teams.length > 0 && completedCount === teams.length

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0217 0%, #170826 40%, #280d38 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>✨</div>
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(24px, 5vw, 28px)',
              margin: 0,
              background: 'linear-gradient(180deg, #fff0b3, #FFC857)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              fontWeight: 700,
            }}
          >
            Diwali Decoration Contest
          </h1>
          <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
            Visit each team counter, grade their bay decoration, and submit your score for all teams!
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ffd9b8' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
            <div>Loading decoration counters...</div>
          </div>
        )}

        {/* Submitted Confirmation State */}
        {!loading && hasSubmitted && (
          <div
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '2px solid rgba(74,222,128,0.4)',
              borderRadius: 24,
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, margin: '0 0 10px', color: '#86efac' }}>
              Ballot Submitted Successfully!
            </h2>
            <p style={{ color: '#ffd9b8', fontSize: 15, lineHeight: 1.5, margin: '0 auto 20px', maxWidth: 460 }}>
              Thank you for visiting and judging all <b>{teams.length} team counters</b>. Your anonymous scores have been locked into the official tally!
            </p>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,200,87,0.15)',
                border: '1px solid #FFC857',
                color: '#FFC857',
                padding: '8px 20px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              🏆 Look up at the Stage Screen for the Grand Winner Announcement!
            </div>
          </div>
        )}

        {/* Voting Paused or Stopped State */}
        {!loading && !hasSubmitted && data?.status !== 'ACTIVE' && (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 22,
              padding: '36px 20px',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>
              {data?.status === 'PAUSED' ? '⏸️' : '🛑'}
            </div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, margin: '0 0 8px' }}>
              {data?.status === 'PAUSED' ? 'Decoration Voting is Paused' : 'Decoration Voting is Closed'}
            </h2>
            <p style={{ color: '#ffd9b8', fontSize: 14, margin: 0 }}>
              {data?.status === 'PAUSED'
                ? 'The organizer has paused scoring temporarily. Please stay on this screen to resume judging.'
                : 'The scoring window has concluded. Please watch the main screen for results!'}
            </p>
          </div>
        )}

        {/* ACTIVE VOTING FLOW */}
        {!loading && !hasSubmitted && data?.status === 'ACTIVE' && teams.length > 0 && (
          <div>
            {/* Overall Progress Ribbon */}
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 18,
                padding: '12px 18px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div style={{ fontSize: 13, color: '#ffd9b8' }}>
                Teams Scored: <b style={{ color: '#FFC857', fontSize: 15 }}>{completedCount} of {teams.length}</b>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: allTeamsCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(255,200,87,0.15)',
                  color: allTeamsCompleted ? '#86efac' : '#FFC857',
                  border: `1px solid ${allTeamsCompleted ? '#22c55e' : 'rgba(255,200,87,0.4)'}`,
                }}
              >
                {allTeamsCompleted ? 'READY TO SUBMIT ✓' : 'MUST VOTE FOR ALL TEAMS'}
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Team Counter Tabs Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${teams.length}, 1fr)`,
                gap: 8,
                marginBottom: 18,
              }}
            >
              {teams.map((t, idx) => {
                const isSelected = idx === activeTeamIdx
                const isDone = isTeamComplete(t, criteria)
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTeamIdx(idx)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.15)',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,200,87,0.25), rgba(255,107,53,0.2))'
                        : isDone
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(10,3,20,0.5)',
                      color: isSelected ? '#FFC857' : isDone ? '#86efac' : '#cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all .15s ease',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>COUNTER</span>
                    <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 800 }}>
                      #{t.teamNumber} {isDone ? '✓' : ''}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Active Team Counter Evaluation Card */}
            {currentTeam && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255,200,87,0.3)',
                  borderRadius: 22,
                  padding: '22px 20px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                  marginBottom: 20,
                }}
              >
                {/* Team Info Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span
                      style={{
                        background: '#FFC857',
                        color: '#000',
                        fontSize: 11,
                        fontWeight: 900,
                        padding: '3px 10px',
                        borderRadius: 999,
                        letterSpacing: '.06em',
                      }}
                    >
                      COUNTER #{currentTeam.teamNumber}
                    </span>
                    <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, margin: '6px 0 2px', color: '#fff' }}>
                      {currentTeam.name}
                    </h2>
                    {currentTeam.description && (
                      <div style={{ fontSize: 13, color: '#ffd9b8' }}>{currentTeam.description}</div>
                    )}
                  </div>

                  {currentTeam.photoUrl && (
                    <img
                      src={currentTeam.photoUrl}
                      alt={currentTeam.name}
                      style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #FFC857' }}
                    />
                  )}
                </div>

                {/* Factors Evaluation List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {criteria.map((c, cIdx) => {
                    const currentScore = scores[currentTeam.id]?.[c.id] || 0
                    const maxScore = c.maxScore || 10
                    const scoreOptions = Array.from({ length: maxScore }, (_, i) => i + 1)

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(10,3,20,0.5)',
                          borderRadius: 16,
                          padding: '14px 16px',
                          border: currentScore > 0 ? '1px solid rgba(255,200,87,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: currentScore > 0 ? '#FFC857' : '#94a3b8' }}>
                            {currentScore > 0 ? `${currentScore} / ${maxScore} Pts` : `Rate 1-${maxScore}`}
                          </span>
                        </div>
                        {c.description && (
                          <div style={{ fontSize: 12, color: '#ffd9b8', marginBottom: 10 }}>{c.description}</div>
                        )}

                        {/* Point Buttons */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${maxScore > 10 ? 10 : maxScore}, 1fr)`,
                            gap: 5,
                          }}
                        >
                          {scoreOptions.map(val => {
                            const isPicked = currentScore === val
                            const isUnder = currentScore >= val
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSetScore(currentTeam.id, c.id, val)}
                                style={{
                                  padding: '8px 0',
                                  borderRadius: 8,
                                  border: isPicked ? '1.5px solid #FFC857' : '1px solid rgba(255,255,255,0.15)',
                                  background: isPicked
                                    ? '#FFC857'
                                    : isUnder
                                    ? 'rgba(255,200,87,0.2)'
                                    : 'rgba(255,255,255,0.06)',
                                  color: isPicked ? '#000' : isUnder ? '#FFC857' : '#fff',
                                  fontFamily: 'Fredoka, sans-serif',
                                  fontSize: 14,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all .1s ease',
                                }}
                              >
                                {val}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Team Navigation & Next Button */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTeamIdx > 0) setActiveTeamIdx(activeTeamIdx - 1)
                    }}
                    disabled={activeTeamIdx === 0}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: activeTeamIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: activeTeamIdx === 0 ? 0.4 : 1,
                    }}
                  >
                    ◀ Prev Counter
                  </button>

                  {activeTeamIdx < teams.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTeamIdx(activeTeamIdx + 1)}
                      style={{
                        flex: 2,
                        padding: 12,
                        borderRadius: 12,
                        border: 0,
                        background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                        color: '#fff',
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Next Counter (Team #{teams[activeTeamIdx + 1].teamNumber}) ▶
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitBallot}
                      disabled={!allTeamsCompleted || submitting}
                      style={{
                        flex: 2,
                        padding: 12,
                        borderRadius: 12,
                        border: 0,
                        background: allTeamsCompleted
                          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                          : 'rgba(255,255,255,0.1)',
                        color: allTeamsCompleted ? '#fff' : '#94a3b8',
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: allTeamsCompleted && !submitting ? 'pointer' : 'not-allowed',
                        boxShadow: allTeamsCompleted ? '0 4px 16px rgba(34,197,94,0.4)' : 'none',
                      }}
                    >
                      {submitting ? 'Submitting Ballot…' : 'Submit All Scores 🌟'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Final Submit Floating Pill (if all teams scored) */}
            {allTeamsCompleted && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={handleSubmitBallot}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 16,
                    border: 0,
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#fff',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(34,197,94,0.5)',
                  }}
                >
                  {submitting ? 'Submitting Ballot…' : `Submit All Scores for ${teams.length} Teams 🌟`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
