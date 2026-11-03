'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { ChoiceAwardsState } from '@/lib/choiceAwards'

export default function AudienceVotingPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load saved votes or submission flag from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const submitted = localStorage.getItem('choice_awards_ballot_submitted') === 'true'
    const saved = localStorage.getItem('choice_awards_selected_votes')
    if (submitted) setHasSubmitted(true)
    if (saved) {
      try {
        setSelectedVotes(JSON.parse(saved))
      } catch {}
    }
  }, [])

  // Poll Choice Awards state every 2 seconds
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
        // network glitch
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleSelectNominee = (categoryId: string, nomineeId: string) => {
    if (data?.status === 'CLOSED') return
    setSelectedVotes(prev => {
      const next = { ...prev, [categoryId]: nomineeId }
      if (typeof window !== 'undefined') {
        localStorage.setItem('choice_awards_selected_votes', JSON.stringify(next))
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!data || data.status === 'CLOSED' || submitting) return
    setErrorMsg('')

    const totalCategories = data.categories.length
    const answeredCount = Object.keys(selectedVotes).length

    if (answeredCount < totalCategories) {
      const missing = totalCategories - answeredCount
      if (!confirm(`You have ${missing} unselected ${missing === 1 ? 'category' : 'categories'}. Would you like to submit your ballot now?`)) {
        return
      }
    }

    setSubmitting(true)
    try {
      // Create or get anonymous voter ID
      let voterHash = ''
      if (typeof window !== 'undefined') {
        voterHash = localStorage.getItem('choice_awards_voter_hash') || ''
        if (!voterHash) {
          voterHash = `voter_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`
          localStorage.setItem('choice_awards_voter_hash', voterHash)
        }
      }

      const res = await fetch('/api/choice-awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: selectedVotes, voterHash }),
      })

      const json = await res.json()
      if (json.success) {
        setHasSubmitted(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('choice_awards_ballot_submitted', 'true')
        }
        // Confetti explosion!
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFC857', '#FFA23A', '#FF6B35', '#ffffff'],
          })
        } catch {}
      } else {
        setErrorMsg(json.message || 'Submission failed. Please try again.')
      }
    } catch {
      setErrorMsg('Network error submitting your ballot.')
    } finally {
      setSubmitting(false)
    }
  }

  const isClosed = data?.status === 'CLOSED'
  const totalCategories = data?.categories.length || 0
  const answeredCount = Object.keys(selectedVotes).length
  const progressPercent = totalCategories > 0 ? Math.round((answeredCount / totalCategories) * 100) : 0

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 20%, #290a42 0%, #0d011c 60%, #05000a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20 }}>Loading Choice Awards Ballot…</div>
      </div>
    )
  }

  // Already submitted screen
  if (hasSubmitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 20%, #290a42 0%, #0d011c 60%, #05000a 100%)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,200,87,0.25), rgba(255,107,53,0.3))',
            border: '2.5px solid #FFC857',
            display: 'grid',
            placeItems: 'center',
            fontSize: 44,
            marginBottom: 20,
            boxShadow: '0 0 40px rgba(255,200,87,0.5)',
            animation: 'pop .5s both',
          }}
        >
          🏆
        </div>

        <h1
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 85%, #FF6B35 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 10px',
          }}
        >
          Ballot Cast Successfully!
        </h1>

        <p style={{ color: '#ffd9b8', fontSize: 16, maxWidth: 360, lineHeight: 1.5, margin: '0 0 24px' }}>
          Your anonymous votes for the GlowFiesta Choice Awards 2026 have been securely recorded.
        </p>

        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,200,87,0.35)',
            borderRadius: 16,
            padding: '16px 20px',
            maxWidth: 360,
            width: '100%',
            marginBottom: 28,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 13, color: '#FFC857', fontWeight: 700, marginBottom: 4 }}>
            🌟 Oscars Reveal Ceremony Tonight!
          </div>
          <div style={{ fontSize: 13, color: '#e2d5f0', lineHeight: 1.45 }}>
            Tune into the main stage projector tonight to watch the live Oscars-style envelope unsealing and winners reveal!
          </div>
        </div>

        {!isClosed && (
          <button
            onClick={() => setHasSubmitted(false)}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12,
              color: '#d8c7ed',
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ✏️ Change / Update My Ballot
          </button>
        )}
      </div>
    )
  }

  // Voting Closed Screen
  if (isClosed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 20%, #290a42 0%, #0d011c 60%, #05000a 100%)',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 26, fontWeight: 800, color: '#FFC857', margin: '0 0 10px' }}>
          Voting Is Now Closed
        </h1>
        <p style={{ color: '#ffd9b8', fontSize: 15, maxWidth: 340, lineHeight: 1.5, margin: '0 0 24px' }}>
          The organizer has stopped accepting responses for the Choice Awards. Thank you to everyone who voted!
        </p>
        <div style={{ background: 'rgba(255,200,87,0.12)', border: '1px solid rgba(255,200,87,0.35)', borderRadius: 14, padding: '14px 20px', maxWidth: 340, fontSize: 13, color: '#FFC857' }}>
          🏆 The live Oscars winner announcement will take place tonight on the main projector screen!
        </div>
      </div>
    )
  }

  // Voting Form Screen (All questions and options together!)
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #290a42 0%, #0d011c 55%, #05000a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px 16px 120px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,200,87,0.15)',
              border: '1px solid rgba(255,200,87,0.35)',
              color: '#FFC857',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            <span>🏆 OFFICIAL AUDIENCE BALLOT</span>
          </div>

          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(26px, 7vw, 36px)',
              fontWeight: 800,
              margin: '0 0 8px',
              background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 85%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.15,
            }}
          >
            Choice Awards 2026
          </h1>

          <p style={{ color: '#ffd9b8', fontSize: 14, margin: '0 0 16px', lineHeight: 1.45 }}>
            Vote for your favorite team and colleagues across all categories below. 100% anonymous ballot.
          </p>

          {/* Progress Indicator */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: '#e2d5f0', fontWeight: 600 }}>
              Progress: <b style={{ color: '#FFC857' }}>{answeredCount}</b> of <b>{totalCategories}</b> categories
            </div>
            <div style={{ width: 120, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #FFA23A, #FFC857)',
                  borderRadius: 999,
                  transition: 'width .3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fecaca', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, marginBottom: 18, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* All Questions / Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data?.categories.map((cat, cIdx) => {
            const chosenNomineeId = selectedVotes[cat.id]

            return (
              <div
                key={cat.id}
                style={{
                  background: 'linear-gradient(145deg, rgba(30,15,48,0.85) 0%, rgba(15,5,28,0.9) 100%)',
                  border: chosenNomineeId ? '1.5px solid rgba(255,200,87,0.5)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '20px 18px',
                  boxShadow: chosenNomineeId
                    ? '0 8px 24px rgba(255,200,87,0.15)'
                    : '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'border .2s ease, box-shadow .2s ease',
                }}
              >
                {/* Category Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#FFC857', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      CATEGORY {cIdx + 1} OF {totalCategories}
                    </span>
                    {chosenNomineeId && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.18)', padding: '2px 8px', borderRadius: 999 }}>
                        ✓ SELECTED
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                    {cat.title}
                  </h2>
                  {cat.subtitle && (
                    <div style={{ fontSize: 13, color: '#c4b5d4', lineHeight: 1.4 }}>
                      {cat.subtitle}
                    </div>
                  )}
                </div>

                {/* Nominees Selection Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cat.nominees.map(nom => {
                    const isSelected = chosenNomineeId === nom.id

                    return (
                      <button
                        key={nom.id}
                        type="button"
                        onClick={() => handleSelectNominee(cat.id, nom.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(255,200,87,0.22) 0%, rgba(255,107,53,0.25) 100%)'
                            : 'rgba(255,255,255,0.04)',
                          border: isSelected
                            ? '2px solid #FFC857'
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 14,
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          color: '#fff',
                          boxShadow: isSelected ? '0 4px 16px rgba(255,200,87,0.25)' : 'none',
                        }}
                      >
                        {/* Radio Check Circle */}
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#FFC857' : 'rgba(255,255,255,0.3)'}`,
                            background: isSelected ? '#FFC857' : 'transparent',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 14,
                            color: '#1a052e',
                            fontWeight: 800,
                            flexShrink: 0,
                            transition: 'all .15s ease',
                          }}
                        >
                          {isSelected && '✓'}
                        </div>

                        {/* Nominee Avatar */}
                        <div
                          style={{
                            fontSize: 26,
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: isSelected ? 'rgba(255,200,87,0.25)' : 'rgba(255,255,255,0.06)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {nom.avatar || '⭐'}
                        </div>

                        {/* Nominee Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: isSelected ? '#FFC857' : '#fff' }}>
                            {nom.name}
                          </div>
                          {nom.role && (
                            <div style={{ fontSize: 12, color: isSelected ? '#ffd9b8' : '#a394bb', marginTop: 2 }}>
                              {nom.role}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Bottom Submission Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(11, 4, 20, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,200,87,0.35)',
          padding: '14px 20px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.6)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFC857' }}>
              {answeredCount === totalCategories
                ? 'All Categories Completed! 🎉'
                : `${answeredCount} of ${totalCategories} Selected`}
            </div>
            <div style={{ fontSize: 11, color: '#a394bb' }}>
              Anonymous Ballot
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount === 0}
            style={{
              height: 48,
              padding: '0 26px',
              borderRadius: 14,
              border: 0,
              background: answeredCount === 0
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #FFC857 0%, #FFA23A 50%, #FF6B35 100%)',
              color: answeredCount === 0 ? '#64748b' : '#1a052e',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 800,
              fontSize: 16,
              cursor: answeredCount === 0 || submitting ? 'not-allowed' : 'pointer',
              boxShadow: answeredCount > 0 ? '0 6px 20px rgba(255,107,53,0.45)' : 'none',
              transition: 'all .15s ease',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Ballot 🗳️'}
          </button>
        </div>
      </div>
    </div>
  )
}
