'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PollStatus } from '@/lib/poll'

interface OptionData {
  id: string
  text: string
  description?: string
  votesCount: number
  percentage: number
}

interface QuestionData {
  id: string
  title: string
  subtitle?: string
  options: OptionData[]
  totalVotes: number
  winnerOptionId?: string | null
}

interface MyVoteData {
  optionId: string
  voterName: string
  isAnonymous: boolean
  votedAt: number
}

interface PollRoomData {
  roomCode: string
  title: string
  status: PollStatus
  activeQuestionIndex: number
  totalQuestions: number
  activeQuestion: QuestionData | null
  myVote: MyVoteData | null
}

export default function AudiencePollPage() {
  const params = useParams()
  const roomCode = String(params.pollCode || '').toUpperCase()

  const [voterId, setVoterId] = useState('')
  const [voterName, setVoterName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [room, setRoom] = useState<PollRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  // Generate or retrieve persistent anonymous voterId
  useEffect(() => {
    if (typeof window === 'undefined') return
    let id = localStorage.getItem('poll_voter_id')
    if (!id) {
      id = 'vtr_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
      localStorage.setItem('poll_voter_id', id)
    }
    setVoterId(id)

    const savedName = localStorage.getItem('poll_voter_name')
    if (savedName) setVoterName(savedName)

    const savedAnon = localStorage.getItem('poll_voter_anon')
    if (savedAnon === 'true') setIsAnonymous(true)
  }, [])

  // Poll room data every 400ms
  useEffect(() => {
    if (!roomCode || !voterId) return
    let active = true

    async function poll() {
      try {
        const url = `/api/poll/${roomCode}?_t=${Date.now()}&voterId=${encodeURIComponent(voterId)}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data: PollRoomData = await res.json()
        if (active) {
          setRoom(data)
          setLoading(false)
        }
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 400)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [roomCode, voterId])

  // Reset selected option when question changes
  useEffect(() => {
    setSelectedOptionId('')
    setFeedbackMsg('')
  }, [room?.activeQuestion?.id])

  // Save voter name / anon preference
  function handleNameChange(val: string) {
    setVoterName(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poll_voter_name', val)
    }
  }

  function handleAnonToggle(checked: boolean) {
    setIsAnonymous(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('poll_voter_anon', checked ? 'true' : 'false')
    }
  }

  // Cast vote
  async function handleVoteSubmit() {
    if (!selectedOptionId || submitting || !room?.activeQuestion) return
    if (!isAnonymous && !voterName.trim()) {
      setFeedbackMsg('Please enter your name or check "Vote Anonymously"')
      return
    }

    setSubmitting(true)
    setFeedbackMsg('')

    try {
      const res = await fetch(`/api/poll/${roomCode}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: room.activeQuestion.id,
          optionId: selectedOptionId,
          voterId,
          voterName: isAnonymous ? 'Anonymous' : voterName.trim(),
          isAnonymous,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 100])
        }
      } else {
        setFeedbackMsg(data.message || 'Could not submit vote')
      }
    } catch {
      setFeedbackMsg('Network error submitting vote')
    }
    setSubmitting(false)
  }

  if (loading && !room) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0114', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(168,85,247,0.3)', borderTopColor: '#c084fc', animation: 'spin 0.75s linear infinite' }} />
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Connecting to Poll…</div>
      </div>
    )
  }

  const stage = room?.status || 'DRAFT'
  const activeQ = room?.activeQuestion
  const hasVoted = Boolean(room?.myVote)
  const isLive = stage === 'LIVE'
  const isReady = stage === 'READY'
  const isStopped = stage === 'STOPPED'
  const isCompleted = stage === 'COMPLETED'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #20083b 0%, #0c0117 60%, #040008 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22 }}>🗳️</div>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {room?.title || 'Live Poll'}
            </div>
            <div style={{ fontSize: 11, color: '#ffd9b8' }}>
              POLL CODE: <b style={{ color: '#FFC857' }}>{roomCode}</b>
            </div>
          </div>
        </div>

        {/* Stage pill */}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            background: isLive
              ? 'rgba(34,197,94,0.2)'
              : isStopped
              ? 'rgba(239,68,68,0.2)'
              : isReady
              ? 'rgba(234,179,8,0.2)'
              : isCompleted
              ? 'rgba(168,85,247,0.2)'
              : 'rgba(255,255,255,0.1)',
            color: isLive ? '#4ade80' : isStopped ? '#f87171' : isReady ? '#fde047' : isCompleted ? '#d8b4fe' : '#94a3b8',
            border: `1px solid ${isLive ? '#22c55e' : isStopped ? '#ef4444' : isReady ? '#eab308' : isCompleted ? '#a855f7' : 'rgba(255,255,255,0.2)'}`,
          }}
        >
          {isLive ? '● VOTING OPEN' : isStopped ? '🛑 VOTING CLOSED' : isReady ? '🟡 SHOWCASE' : isCompleted ? '🏆 WINNER' : '⚪ DRAFT'}
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
          padding: '24px 20px 48px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Category Header Card */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            border: '1.5px solid rgba(255,200,87,0.3)',
            borderRadius: 20,
            padding: '20px 22px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#ffd9b8', textTransform: 'uppercase', marginBottom: 4 }}>
            CATEGORY #{room ? room.activeQuestionIndex + 1 : 1} OF {room?.totalQuestions || 1}
          </div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 6px', color: '#FFC857' }}>
            {activeQ?.title || 'Waiting for next category…'}
          </h1>
          {activeQ?.subtitle && (
            <div style={{ fontSize: 14, color: '#c4b5d4' }}>{activeQ.subtitle}</div>
          )}
        </div>

        {/* Voter Identity Card (Name or Anonymous) */}
        {!hasVoted && isLive && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#e5d9f2' }}>
                VOTER IDENTITY
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ffd9b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => handleAnonToggle(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <span>Vote Anonymously 🕶️</span>
              </label>
            </div>

            {!isAnonymous && (
              <input
                type="text"
                placeholder="Enter your name or team"
                value={voterName}
                onChange={e => handleNameChange(e.target.value)}
                maxLength={40}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(10,3,20,0.6)',
                  color: '#fff',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        )}

        {/* FEEDBACK ERROR */}
        {feedbackMsg && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
            ⚠️ {feedbackMsg}
          </div>
        )}

        {/* STAGE NOTIFICATION BANNER */}
        {stage === 'DRAFT' && (
          <div style={{ padding: '24px', textAlign: 'center', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)', color: '#a394bb' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#ffd9b8' }}>
              Poll is in Draft Mode
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              The host is setting up the nominees. Please keep this screen open!
            </div>
          </div>
        )}

        {stage === 'READY' && (
          <div style={{ padding: '20px', textAlign: 'center', borderRadius: 18, background: 'rgba(234,179,8,0.12)', border: '1.5px solid rgba(234,179,8,0.4)', color: '#fde047' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🟡</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700 }}>
              Category Showcase (Voting Opens Soon!)
            </div>
            <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
              Review the nominees below. Voting will unlock when the host goes LIVE!
            </div>
          </div>
        )}

        {stage === 'STOPPED' && (
          <div style={{ padding: '20px', textAlign: 'center', borderRadius: 18, background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🛑</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#f87171' }}>
              Voting Closed for this Category
            </div>
            <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
              The host has locked ballots for this question. Winner reveal coming up next!
            </div>
          </div>
        )}

        {stage === 'COMPLETED' && (
          <div style={{ padding: '20px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(255,200,87,0.2), rgba(168,85,247,0.2))', border: '1.5px solid #FFC857', color: '#FFC857', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🏆</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 800 }}>
              Category Winner Announced!
            </div>
            <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
              Check out the winning nominee crowned below!
            </div>
          </div>
        )}

        {/* NOMINEES / OPTIONS CARDS */}
        {activeQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeQ.options.map(opt => {
              const isSelected = selectedOptionId === opt.id
              const isMyVote = room.myVote?.optionId === opt.id
              const isWinner = activeQ.winnerOptionId === opt.id
              const showPercentages = hasVoted || isStopped || isCompleted

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (isLive && !hasVoted) setSelectedOptionId(opt.id)
                  }}
                  style={{
                    position: 'relative',
                    padding: '16px 20px',
                    borderRadius: 18,
                    background: isWinner
                      ? 'linear-gradient(135deg, rgba(255,200,87,0.22), rgba(255,107,53,0.18))'
                      : isMyVote
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(20,83,45,0.2))'
                      : isSelected
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(126,34,206,0.2))'
                      : 'rgba(255,255,255,0.04)',
                    border: isWinner
                      ? '2px solid #FFC857'
                      : isMyVote
                      ? '2px solid #22c55e'
                      : isSelected
                      ? '2px solid #c084fc'
                      : '1px solid rgba(255,255,255,0.1)',
                    cursor: isLive && !hasVoted ? 'pointer' : 'default',
                    boxShadow: isSelected ? '0 0 20px rgba(168,85,247,0.4)' : isWinner ? '0 0 24px rgba(255,200,87,0.3)' : 'none',
                    transition: 'all .15s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Progress fill (if voted, stopped, or completed) */}
                  {showPercentages && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${opt.percentage}%`,
                        background: isWinner
                          ? 'rgba(255,200,87,0.18)'
                          : isMyVote
                          ? 'rgba(34,197,94,0.18)'
                          : 'rgba(255,255,255,0.06)',
                        zIndex: 0,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  )}

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: isWinner ? '#FFC857' : isMyVote ? '#4ade80' : '#fff' }}>
                        {opt.text}
                      </div>
                      {opt.description && (
                        <div style={{ fontSize: 13, color: '#c4b5d4', marginTop: 2 }}>
                          {opt.description}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {showPercentages ? (
                        <div style={{ fontFamily: 'Fredoka, monospace', fontSize: 20, fontWeight: 800, color: isWinner ? '#FFC857' : isMyVote ? '#4ade80' : '#d8b4fe' }}>
                          {opt.percentage}%
                        </div>
                      ) : isLive ? (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#c084fc' : 'rgba(255,255,255,0.3)'}`,
                            background: isSelected ? '#a855f7' : 'transparent',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 14,
                            color: '#fff',
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isWinner && (
                    <div style={{ position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 800, color: '#FFC857', marginTop: 6 }}>
                      🏆 WINNER OF THIS CATEGORY!
                    </div>
                  )}

                  {isMyVote && !isWinner && (
                    <div style={{ position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 800, color: '#4ade80', marginTop: 6 }}>
                      ✓ YOUR VOTE CAST HERE
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* SUBMIT BUTTON (WHEN LIVE & NOT VOTED) */}
        {isLive && !hasVoted && (
          <button
            onClick={handleVoteSubmit}
            disabled={!selectedOptionId || submitting}
            style={{
              height: 54,
              borderRadius: 16,
              border: 0,
              background: selectedOptionId
                ? 'linear-gradient(135deg, #a855f7, #7e22ce)'
                : 'rgba(255,255,255,0.1)',
              color: selectedOptionId ? '#fff' : '#887d9c',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 18,
              fontWeight: 800,
              cursor: selectedOptionId && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: selectedOptionId ? '0 8px 26px rgba(168,85,247,0.45)' : 'none',
              transition: 'all .15s ease',
            }}
          >
            {submitting ? 'SUBMITTING VOTE…' : selectedOptionId ? 'CAST MY VOTE 🗳️' : 'SELECT A NOMINEE'}
          </button>
        )}

        {/* CONFIRMATION CARD (AFTER VOTING) */}
        {hasVoted && !isCompleted && !isStopped && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(20,83,45,0.2))',
              border: '1.5px solid #22c55e',
              borderRadius: 18,
              padding: '18px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(34,197,94,0.25)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>🎉</div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#86efac' }}>
              Your Vote Has Been Recorded!
            </div>
            <div style={{ fontSize: 13, color: '#dcfce7', marginTop: 4 }}>
              Watch the big screen as the host reveals the winner!
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
