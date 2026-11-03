'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { ChoiceAwardsState, AwardCategory, AwardNominee } from '@/lib/choiceAwards'

export default function AudienceVotingPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNomineeId, setSelectedNomineeId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [votedCategories, setVotedCategories] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load local voted history for this device
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('choice_awards_voted_cats')
      if (saved) {
        setVotedCategories(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Poll state every 2 seconds
  useEffect(() => {
    let active = true

    async function fetchState() {
      try {
        const res = await fetch(`/api/choice-awards?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {
        // network error
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // Find active category
  const categories = data?.categories || []
  const activeCatIndex = categories.findIndex(c => c.id === data?.activeCategoryId)
  const activeCategory = activeCatIndex !== -1 ? categories[activeCatIndex] : categories[0] || null

  const isVotedForActive = activeCategory ? Boolean(votedCategories[activeCategory.id]) : false
  const votedNomineeName = activeCategory && isVotedForActive ? votedCategories[activeCategory.id] : null

  // Submit Vote for the currently active question
  async function handleVoteSubmit() {
    if (!activeCategory || !selectedNomineeId || submitting) return
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    // Device identification (one vote per device)
    let voterHash = ''
    if (typeof window !== 'undefined') {
      voterHash = localStorage.getItem('choice_awards_device_id') || ''
      if (!voterHash) {
        voterHash = `dev_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`
        localStorage.setItem('choice_awards_device_id', voterHash)
      }
    }

    try {
      const res = await fetch('/api/choice-awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: activeCategory.id,
          nomineeId: selectedNomineeId,
          voterHash,
        }),
      })

      const json = await res.json()
      if (json.success) {
        const selectedNom = activeCategory.nominees.find(n => n.id === selectedNomineeId)
        const nomName = selectedNom?.name || 'your selected nominee'

        // Save locally
        const nextVoted = { ...votedCategories, [activeCategory.id]: nomName }
        setVotedCategories(nextVoted)
        if (typeof window !== 'undefined') {
          localStorage.setItem('choice_awards_voted_cats', JSON.stringify(nextVoted))
        }

        setSuccessMsg('Your vote has been cast anonymously! Thank you!')
        setSelectedNomineeId(null)

        // Confetti burst
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFC857', '#FFA23A', '#a855f7', '#22c55e'],
        })
      } else {
        setErrorMsg(json.message || 'Failed to submit vote.')
      }
    } catch {
      setErrorMsg('Network error while casting vote. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0217 0%, #1a0826 40%, #2b0e3a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🏆</div>
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
            GlowFiesta Choice Awards
          </h1>
          <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
            Official Live Audience Voting • Anonymous & Secure (1 Vote Per Device)
          </div>
        </div>

        {/* Global Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ffd9b8' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
            <div>Connecting to live studio...</div>
          </div>
        )}

        {/* Ceremony Notice Screen */}
        {!loading && data?.mode === 'CEREMONY' && (
          <div
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.2) 0%, rgba(20,5,30,0.85) 80%)',
              border: '2px solid rgba(245,158,11,0.5)',
              borderRadius: 24,
              padding: '36px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, margin: '0 0 10px', color: '#FFC857' }}>
              The Oscars Ceremony is Live!
            </h2>
            <p style={{ color: '#ffd9b8', fontSize: 15, lineHeight: 1.5, margin: '0 auto 20px', maxWidth: 400 }}>
              Voting has officially closed. Please look up at the main stage screen as the host reveals each award winner in dramatic Oscars fashion!
            </p>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,200,87,0.15)',
                border: '1px solid #FFC857',
                color: '#FFC857',
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✨ Enjoy the Show!
            </div>
          </div>
        )}

        {/* Waiting for Categories */}
        {!loading && data?.mode !== 'CEREMONY' && categories.length === 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: 22,
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: '0 0 8px' }}>
              Waiting for Awards to Start
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              The host will launch the first award question shortly. Please stay on this page!
            </p>
          </div>
        )}

        {/* LIVE QUESTION VOTING CARD */}
        {!loading && data?.mode === 'LIVE_VOTING' && activeCategory && (
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255,200,87,0.35)',
              borderRadius: 24,
              padding: '24px 20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            {/* Question Header */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    background: 'rgba(255,200,87,0.18)',
                    color: '#FFC857',
                    padding: '3px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '.05em',
                  }}
                >
                  QUESTION {activeCatIndex + 1} OF {categories.length}
                </span>

                {/* Live Status Badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background:
                      data?.questionVotingState === 'VOTING'
                        ? 'rgba(34,197,94,0.2)'
                        : data?.questionVotingState === 'PAUSED'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(239,68,68,0.2)',
                    color:
                      data?.questionVotingState === 'VOTING'
                        ? '#86efac'
                        : data?.questionVotingState === 'PAUSED'
                        ? '#fde68a'
                        : '#fca5a5',
                    border: `1px solid ${
                      data?.questionVotingState === 'VOTING'
                        ? '#22c55e'
                        : data?.questionVotingState === 'PAUSED'
                        ? '#f59e0b'
                        : '#ef4444'
                    }`,
                  }}
                >
                  {data?.questionVotingState === 'VOTING' && '● VOTING ACTIVE'}
                  {data?.questionVotingState === 'PAUSED' && '⏸️ VOTING PAUSED'}
                  {data?.questionVotingState === 'STOPPED' && '🛑 VOTING CLOSED'}
                  {data?.questionVotingState === 'IDLE' && '⏳ PREPARING'}
                </span>
              </div>

              <h2
                style={{
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 'clamp(20px, 4.5vw, 24px)',
                  margin: '8px 0 4px',
                  color: '#fff',
                }}
              >
                {activeCategory.title}
              </h2>
              {activeCategory.subtitle && (
                <div style={{ fontSize: 13, color: '#ffd9b8', lineHeight: 1.4 }}>
                  {activeCategory.subtitle}
                </div>
              )}
            </div>

            {/* Error Message */}
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

            {/* Success / Already Voted State */}
            {isVotedForActive ? (
              <div
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1.5px solid rgba(74,222,128,0.4)',
                  borderRadius: 18,
                  padding: '24px 18px',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 42, marginBottom: 8 }}>🎉</div>
                <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, color: '#86efac', fontWeight: 700 }}>
                  Vote Recorded!
                </div>
                <div style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                  You voted for <b>{votedNomineeName}</b>
                </div>
                <div style={{ color: '#ffd9b8', fontSize: 12, marginTop: 10 }}>
                  Results will be revealed live during the Oscars ceremony. Stay tuned for the host to move to the next question!
                </div>
              </div>
            ) : data?.questionVotingState !== 'VOTING' ? (
              /* Non-Voting Warning */
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 18,
                  padding: '30px 18px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>
                  {data?.questionVotingState === 'PAUSED' ? '⏸️' : data?.questionVotingState === 'STOPPED' ? '🛑' : '⏳'}
                </div>
                <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700 }}>
                  {data?.questionVotingState === 'PAUSED' && 'Voting is Temporarily Paused'}
                  {data?.questionVotingState === 'STOPPED' && 'Voting Closed for this Question'}
                  {data?.questionVotingState === 'IDLE' && 'Voting Has Not Started Yet'}
                </div>
                <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 6, maxWidth: 360, margin: '6px auto 0' }}>
                  {data?.questionVotingState === 'PAUSED' && 'The host has paused voting briefly. It will resume in a moment.'}
                  {data?.questionVotingState === 'STOPPED' && 'Host is closing this question and will advance to the next award soon.'}
                  {data?.questionVotingState === 'IDLE' && 'Please wait while the host introduces this category and nominees.'}
                </div>
              </div>
            ) : (
              /* ACTIVE NOMINEE SELECTION FORM */
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd9b8', textTransform: 'uppercase', marginBottom: 12 }}>
                  Select One Nominee to Cast Your Vote:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {activeCategory.nominees.map(nom => {
                    const isSelected = selectedNomineeId === nom.id
                    return (
                      <div
                        key={nom.id}
                        onClick={() => setSelectedNomineeId(nom.id)}
                        style={{
                          background: isSelected ? 'rgba(255,200,87,0.16)' : 'rgba(10,3,20,0.5)',
                          border: isSelected ? '2px solid #FFC857' : '1.5px solid rgba(255,255,255,0.12)',
                          borderRadius: 16,
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          cursor: 'pointer',
                          transition: 'all .15s ease',
                          boxShadow: isSelected ? '0 6px 20px rgba(255,200,87,0.2)' : 'none',
                        }}
                      >
                        {/* Radio indicator */}
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#FFC857' : 'rgba(255,255,255,0.3)'}`,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFC857' }} />
                          )}
                        </div>

                        {/* Photo or Avatar */}
                        {nom.photoUrl ? (
                          <img
                            src={nom.photoUrl}
                            alt={nom.name}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              objectFit: 'cover',
                              border: isSelected ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.2)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background: 'rgba(255,255,255,0.1)',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 24,
                              flexShrink: 0,
                            }}
                          >
                            {nom.avatar || '⭐'}
                          </div>
                        )}

                        {/* Nominee details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
                            {nom.name}
                          </div>
                          {nom.role && (
                            <div style={{ fontSize: 12.5, color: '#ffd9b8', marginTop: 2 }}>
                              {nom.role}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Submit Vote Button */}
                <button
                  type="button"
                  disabled={!selectedNomineeId || submitting}
                  onClick={handleVoteSubmit}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 16,
                    border: 0,
                    background: selectedNomineeId
                      ? 'linear-gradient(135deg, #FFA23A, #FF6B35 60%, #e8431a)'
                      : 'rgba(255,255,255,0.12)',
                    color: selectedNomineeId ? '#fff' : '#94a3b8',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: selectedNomineeId && !submitting ? 'pointer' : 'not-allowed',
                    boxShadow: selectedNomineeId ? '0 6px 20px rgba(255,107,53,0.4)' : 'none',
                    transition: 'all .2s ease',
                  }}
                >
                  {submitting ? 'Locking in your vote…' : 'Cast My Vote 🗳️'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
