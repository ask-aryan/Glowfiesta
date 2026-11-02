'use client'
import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PollStatus } from '@/lib/poll'

interface OptionData {
  id: string
  text: string
  description?: string
  imageUrl?: string
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

interface QuestionSummary {
  id: string
  title: string
  subtitle?: string
  optionsCount: number
  totalVotes: number
  isActive: boolean
}

interface PollRoomData {
  roomCode: string
  title: string
  status: PollStatus
  activeQuestionIndex: number
  totalQuestions: number
  isHost: boolean
  activeQuestion: QuestionData | null
  questionsList?: QuestionSummary[]
}

export default function PollAdminPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomCode = String(params.pollCode || '').toUpperCase()

  const [hostKey, setHostKey] = useState('')
  const [room, setRoom] = useState<PollRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // QR Code
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)

  // Edit question state
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [editOptions, setEditOptions] = useState<Array<{ id?: string; text: string; description?: string }>>([])

  // Load hostKey
  useEffect(() => {
    let key = searchParams.get('key') || ''
    if (!key && typeof window !== 'undefined') {
      key = localStorage.getItem(`poll_host_${roomCode}`) || ''
    }
    if (key) {
      setHostKey(key)
    }
  }, [searchParams, roomCode])

  // Generate QR Code
  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) return
    const shareUrl = `${window.location.origin}/poll/${roomCode}`
    import('qrcode')
      .then(QRCode => {
        QRCode.toDataURL(shareUrl, {
          width: 340,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).then(setQrDataUrl).catch(() => {})
      })
      .catch(() => {})
  }, [roomCode])

  // Poll room data every 500ms
  useEffect(() => {
    if (!roomCode) return
    let active = true

    async function fetchRoom() {
      try {
        const url = `/api/poll/${roomCode}?_t=${Date.now()}${hostKey ? `&hostKey=${encodeURIComponent(hostKey)}` : ''}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) {
          if (res.status === 404) setErrorMsg('Poll room not found')
          return
        }
        const data: PollRoomData = await res.json()
        if (active) {
          setRoom(data)
          setLoading(false)
        }
      } catch {}
    }

    fetchRoom()
    const interval = setInterval(fetchRoom, 500)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [roomCode, hostKey])

  // Update status (DRAFT, READY, LIVE, COMPLETED)
  async function handleSetStatus(newStatus: PollStatus) {
    if (!hostKey) {
      alert('Host admin key is missing. Please access admin using the key link.')
      return
    }
    if (actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/poll/${roomCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? { ...prev, status: newStatus } : null)
      } else {
        alert(data.message || 'Failed to update status')
      }
    } catch {
      alert('Network error updating poll status')
    } finally {
      setActionLoading(false)
    }
  }

  // Switch question
  async function handleSwitchQuestion(index: number) {
    if (!hostKey || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, action: 'switch', index }),
      })
      const data = await res.json()
      if (data.success && room) {
        setRoom({
          ...room,
          activeQuestionIndex: index,
          activeQuestion: data.activeQuestion,
        })
        setIsEditingQuestion(false)
      }
    } catch {}
    setActionLoading(false)
  }

  // Open question editor
  function handleOpenEdit() {
    if (!room?.activeQuestion) return
    setEditTitle(room.activeQuestion.title)
    setEditSubtitle(room.activeQuestion.subtitle || '')
    setEditOptions(room.activeQuestion.options.map(o => ({ id: o.id, text: o.text, description: o.description || '' })))
    setIsEditingQuestion(true)
  }

  // Save question & nominees
  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!hostKey || !room?.activeQuestion) return
    const filteredOpts = editOptions.filter(o => o.text.trim())
    if (filteredOpts.length < 2) {
      alert('Please add at least 2 nominees / options')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostKey,
          action: 'save',
          questionData: {
            id: room.activeQuestion.id,
            title: editTitle.trim(),
            subtitle: editSubtitle.trim(),
            options: filteredOpts,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsEditingQuestion(false)
      }
    } catch {}
    setActionLoading(false)
  }

  // Add new blank question/category
  async function handleAddNewQuestion() {
    if (!hostKey || actionLoading || !room) return
    setActionLoading(true)
    const newIdx = room.questionsList ? room.questionsList.length + 1 : 2
    try {
      await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostKey,
          action: 'save',
          questionData: {
            id: `q_${roomCode}_${Date.now()}`,
            title: `Category ${newIdx}: Best Innovation`,
            subtitle: 'Honoring creativity and out-of-the-box thinking',
            options: [
              { text: 'Nominee A', description: 'Tech Team' },
              { text: 'Nominee B', description: 'Operations' },
            ],
          },
        }),
      })
    } catch {}
    setActionLoading(false)
  }

  // Reset votes for current category
  async function handleResetVotes() {
    if (!hostKey || actionLoading || !confirm('Reset all votes for this current category?')) return
    setActionLoading(true)
    try {
      await fetch(`/api/poll/${roomCode}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, questionId: room?.activeQuestion?.id }),
      })
    } catch {}
    setActionLoading(false)
  }

  function handleCopyShareLink() {
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/poll/${roomCode}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (loading && !room) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0114', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(255,200,87,0.3)', borderTopColor: '#FFC857', animation: 'spin 0.75s linear infinite' }} />
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18 }}>Connecting to Poll Admin…</div>
      </div>
    )
  }

  if (errorMsg || !room) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0114', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{errorMsg || 'Room not available'}</div>
        <Link href="/poll" style={{ marginTop: 16, padding: '12px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #FFC857, #FFA23A)', color: '#000', textDecoration: 'none', fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}>
          Create New Poll Room
        </Link>
      </div>
    )
  }

  const currentStage = room.status
  const activeQ = room.activeQuestion

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #24073d 0%, #0d011c 55%, #05000a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Admin Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/poll" style={{ color: '#ffd9b8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            ← Poll Hub
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700 }}>
              {room.title}
            </div>
            <div style={{ fontSize: 12, color: '#ffd9b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>POLL CODE:</span>
              <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 800, fontSize: 14, letterSpacing: '.08em', color: '#FFC857', background: 'rgba(255,200,87,0.14)', padding: '2px 8px', borderRadius: 6 }}>
                {roomCode}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Big screen projector link */}
          <a
            href={`/poll/${roomCode}/live`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(168,85,247,0.18)',
              border: '1.5px solid rgba(168,85,247,0.45)',
              color: '#d8b4fe',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🖥️</span>
            <span>OPEN PROJECTOR VIEW</span>
          </a>

          {/* Share button */}
          <button
            onClick={handleCopyShareLink}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
              color: copied ? '#4ade80' : '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{copied ? '✓ COPIED' : '📋 COPY AUDIENCE LINK'}</span>
          </button>

          {/* QR code button */}
          <button
            onClick={() => setShowQrModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(255,200,87,0.14)',
              border: '1.5px solid rgba(255,200,87,0.45)',
              color: '#FFC857',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>📱</span>
            <span>QR CODE</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main
        style={{
          flex: 1,
          maxWidth: 1080,
          margin: '0 auto',
          width: '100%',
          padding: '24px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* STAGE CONTROLS */}
        <section
          style={{
            background: 'linear-gradient(145deg, rgba(20,5,35,0.9), rgba(10,2,18,0.9))',
            border: '2px solid rgba(255,200,87,0.3)',
            borderRadius: 22,
            padding: 22,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#ffd9b8', textTransform: 'uppercase' }}>
                LIVE POLL STAGE
              </div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                Current Stage: <span style={{ color: currentStage === 'LIVE' ? '#4ade80' : currentStage === 'READY' ? '#fde047' : currentStage === 'COMPLETED' ? '#c084fc' : '#94a3b8' }}>{currentStage}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleResetVotes}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#f87171',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🔁</span>
                <span>Reset Votes</span>
              </button>
            </div>
          </div>

          {/* Stage Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {/* DRAFT */}
            <button
              onClick={() => handleSetStatus('DRAFT')}
              disabled={actionLoading}
              style={{
                height: 50,
                borderRadius: 14,
                border: currentStage === 'DRAFT' ? '2px solid #94a3b8' : '1px solid rgba(255,255,255,0.12)',
                background: currentStage === 'DRAFT' ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.05)',
                color: currentStage === 'DRAFT' ? '#fff' : '#94a3b8',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ⚪ DRAFT (EDIT)
            </button>

            {/* READY */}
            <button
              onClick={() => handleSetStatus('READY')}
              disabled={actionLoading}
              style={{
                height: 50,
                borderRadius: 14,
                border: currentStage === 'READY' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.12)',
                background: currentStage === 'READY' ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.05)',
                color: currentStage === 'READY' ? '#fde047' : '#ca8a04',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              🟡 READY (SHOWCASE)
            </button>

            {/* LIVE */}
            <button
              onClick={() => handleSetStatus('LIVE')}
              disabled={actionLoading}
              style={{
                height: 50,
                borderRadius: 14,
                border: currentStage === 'LIVE' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.12)',
                background: currentStage === 'LIVE' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                color: currentStage === 'LIVE' ? '#fff' : '#22c55e',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: currentStage === 'LIVE' ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
              }}
            >
              🟢 GO LIVE (VOTE)
            </button>

            {/* COMPLETED */}
            <button
              onClick={() => handleSetStatus('COMPLETED')}
              disabled={actionLoading}
              style={{
                height: 50,
                borderRadius: 14,
                border: currentStage === 'COMPLETED' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.12)',
                background: currentStage === 'COMPLETED' ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : 'rgba(255,255,255,0.05)',
                color: currentStage === 'COMPLETED' ? '#fff' : '#c084fc',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: currentStage === 'COMPLETED' ? '0 0 20px rgba(168,85,247,0.5)' : 'none',
              }}
            >
              🏆 REVEAL WINNER!
            </button>
          </div>
        </section>

        {/* QUESTIONS / CATEGORIES TABS */}
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {room.questionsList?.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleSwitchQuestion(idx)}
              style={{
                padding: '10px 18px',
                borderRadius: 14,
                background: idx === room.activeQuestionIndex ? 'linear-gradient(135deg, #FFC857, #FFA23A)' : 'rgba(255,255,255,0.05)',
                color: idx === room.activeQuestionIndex ? '#000' : '#fff',
                border: idx === room.activeQuestionIndex ? 'none' : '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{idx + 1}.</span>
              <span>{q.title}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>({q.totalVotes} votes)</span>
            </button>
          ))}

          <button
            onClick={handleAddNewQuestion}
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.08)',
              border: '1px dashed rgba(255,255,255,0.3)',
              color: '#FFC857',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Add Category
          </button>
        </section>

        {/* ACTIVE QUESTION & NOMINEES DETAILS */}
        <section
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}
        >
          {!isEditingQuestion ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ffd9b8', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    CATEGORY #{room.activeQuestionIndex + 1}
                  </div>
                  <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 26, fontWeight: 800, margin: '2px 0 4px', color: '#FFC857' }}>
                    {activeQ?.title}
                  </h2>
                  {activeQ?.subtitle && (
                    <div style={{ fontSize: 14, color: '#c4b5d4' }}>{activeQ.subtitle}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 14, color: '#ffd9b8', background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 999 }}>
                    Total Votes: <b>{activeQ?.totalVotes || 0}</b>
                  </div>
                  <button
                    onClick={handleOpenEdit}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,200,87,0.15)',
                      border: '1px solid rgba(255,200,87,0.4)',
                      color: '#FFC857',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit Nominees
                  </button>
                </div>
              </div>

              {/* Nominees List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {activeQ?.options.map((opt, idx) => {
                  const isWinner = activeQ.winnerOptionId === opt.id
                  return (
                    <div
                      key={opt.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 16,
                        background: isWinner ? 'linear-gradient(135deg, rgba(255,200,87,0.2), rgba(255,107,53,0.15))' : 'rgba(255,255,255,0.04)',
                        border: isWinner ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Live progress fill */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 0,
                          top: 0,
                          width: `${opt.percentage}%`,
                          background: isWinner ? 'rgba(255,200,87,0.15)' : 'rgba(168,85,247,0.12)',
                          zIndex: 0,
                          transition: 'width 0.4s ease',
                        }}
                      />

                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 700, color: isWinner ? '#FFC857' : '#fff' }}>
                            {opt.text}
                          </div>
                          <div style={{ fontFamily: 'Fredoka, monospace', fontSize: 18, fontWeight: 800, color: isWinner ? '#FFC857' : '#d8b4fe' }}>
                            {opt.percentage}%
                          </div>
                        </div>

                        {opt.description && (
                          <div style={{ fontSize: 12, color: '#a89bc2', marginBottom: 8 }}>
                            {opt.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#ffd9b8' }}>
                          <span>{opt.votesCount} {opt.votesCount === 1 ? 'vote' : 'votes'}</span>
                          {isWinner && (
                            <span style={{ color: '#4ade80', fontWeight: 800 }}>🏆 WINNER!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Question & Nominees Editor */
            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, margin: 0, color: '#FFC857' }}>
                  Edit Category & Nominees
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingQuestion(false)}
                  style={{ background: 'none', border: 0, color: '#a394bb', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 4 }}>
                  CATEGORY / QUESTION TITLE
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  placeholder="e.g. Star Performer of the Year"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e5d9f2', marginBottom: 4 }}>
                  SUBTITLE / CRITERIA (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={e => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Excellence in Team Collaboration"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#e5d9f2' }}>
                    NOMINEES / OPTIONS
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditOptions([...editOptions, { text: '', description: '' }])}
                    style={{ background: 'none', border: 0, color: '#FFC857', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Nominee
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Nominee ${idx + 1} Name`}
                        value={opt.text}
                        onChange={e => {
                          const updated = [...editOptions]
                          updated[idx].text = e.target.value
                          setEditOptions(updated)
                        }}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 14 }}
                      />
                      <input
                        type="text"
                        placeholder="Tag / Dept (optional)"
                        value={opt.description || ''}
                        onChange={e => {
                          const updated = [...editOptions]
                          updated[idx].description = e.target.value
                          setEditOptions(updated)
                        }}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 14 }}
                      />
                      {editOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setEditOptions(editOptions.filter((_, i) => i !== idx))}
                          style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: 'rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingQuestion(false)}
                  style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#ccc', fontFamily: 'Fredoka, sans-serif', fontSize: 15, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ flex: 2, height: 46, borderRadius: 12, border: 0, background: 'linear-gradient(135deg, #FFC857, #FFA23A)', color: '#000', fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Saving…' : 'Save Nominees & Category'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,1,10,0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowQrModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'linear-gradient(145deg, #240a38 0%, #110220 100%)',
              border: '2px solid rgba(255,200,87,0.5)',
              borderRadius: 28,
              padding: '30px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowQrModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 0, width: 34, height: 34, borderRadius: '50%', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              ✕
            </button>

            <div style={{ fontSize: 32, marginBottom: 6 }}>📱</div>
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#FFC857' }}>
              Scan to Vote
            </h3>
            <div style={{ fontSize: 13, color: '#ffd9b8', marginBottom: 16 }}>
              Audience members can scan to cast their vote in real time
            </div>

            {qrDataUrl && (
              <div style={{ background: '#fff', padding: 12, borderRadius: 16, marginBottom: 16, boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Poll QR" style={{ width: 240, height: 240, display: 'block', borderRadius: 8 }} />
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,200,87,0.3)', borderRadius: 12, padding: '8px 16px', width: '100%', boxSizing: 'border-box', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8' }}>POLL CODE</div>
              <div style={{ fontFamily: 'Fredoka, monospace', fontSize: 24, fontWeight: 800, color: '#FFC857' }}>
                {roomCode}
              </div>
            </div>

            <button
              onClick={handleCopyShareLink}
              style={{ width: '100%', height: 46, borderRadius: 12, border: 0, background: 'linear-gradient(135deg, #FFC857, #FFA23A)', color: '#000', fontFamily: 'Fredoka, sans-serif', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
            >
              {copied ? '✓ COPIED LINK' : '📋 COPY AUDIENCE LINK'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
