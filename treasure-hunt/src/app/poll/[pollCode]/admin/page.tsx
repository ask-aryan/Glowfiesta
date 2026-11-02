'use client'
import React, { useEffect, useState, useRef } from 'react'
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
  isActive?: boolean
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
  showResultsLive?: boolean
  activeQuestion: QuestionData | null
  questions?: QuestionData[]
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

  const isEditingRef = useRef(false)
  isEditingRef.current = isEditingQuestion

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
          setRoom(prev => {
            if (!prev) return data
            if (isEditingRef.current) {
              return {
                ...data,
                activeQuestionIndex: prev.activeQuestionIndex,
                activeQuestion: prev.activeQuestion,
              }
            }
            return data
          })
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

  // Update status (DRAFT, READY, LIVE, STOPPED, COMPLETED)
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

  // Switch category
  async function handleSwitchQuestion(index: number) {
    if (!hostKey || !room) return
    const categoriesCount = room.questions?.length || room.questionsList?.length || 0
    if (index < 0 || index >= categoriesCount) return
    if (index === room.activeQuestionIndex && !isEditingQuestion) return

    const targetQ = room.questions ? room.questions[index] : null

    // Optimistic switch immediately with zero lag
    setRoom(prev => {
      if (!prev) return null
      return {
        ...prev,
        activeQuestionIndex: index,
        activeQuestion: targetQ || prev.activeQuestion,
      }
    })
    setIsEditingQuestion(false)

    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, action: 'switch', index }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? {
          ...prev,
          activeQuestionIndex: data.activeQuestionIndex,
          activeQuestion: data.activeQuestion,
          questions: data.questions || prev.questions,
        } : null)
      }
    } catch {}
  }

  // Advance to Next Category & open in READY mode
  async function handleNextCategory() {
    if (!hostKey || actionLoading || !room) return
    const categoriesCount = room.questions?.length || room.questionsList?.length || 0
    if (currentIdx >= categoriesCount - 1) return

    const nextIdx = currentIdx + 1
    const targetQ = room.questions ? room.questions[nextIdx] : null

    // Optimistic update
    setRoom(prev => {
      if (!prev) return null
      return {
        ...prev,
        activeQuestionIndex: nextIdx,
        status: 'READY',
        activeQuestion: targetQ || prev.activeQuestion,
      }
    })
    setIsEditingQuestion(false)

    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, action: 'next' }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? {
          ...prev,
          activeQuestionIndex: data.activeQuestionIndex,
          status: 'READY',
          activeQuestion: data.activeQuestion,
          questions: data.questions || prev.questions,
        } : null)
      }
    } catch {}
  }

  // Toggle suspense mode
  async function handleToggleSuspense() {
    if (!hostKey || actionLoading || !room) return
    setActionLoading(true)
    const nextVal = !room.showResultsLive
    try {
      const res = await fetch(`/api/poll/${roomCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, showResultsLive: nextVal }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? { ...prev, showResultsLive: nextVal } : null)
      }
    } catch {} finally {
      setActionLoading(false)
    }
  }

  // Start results reveal ceremony starting from Category #1 (index 0)
  async function handleStartRevealCeremony() {
    if (!hostKey || actionLoading || !room) return
    setActionLoading(true)
    try {
      // 1. Switch to index 0
      await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, action: 'switch', index: 0 }),
      })
      // 2. Put into STOPPED mode (awaiting reveal)
      await fetch(`/api/poll/${roomCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, status: 'STOPPED' }),
      })
      const firstQ = room.questions ? room.questions[0] : null
      setRoom(prev => prev ? {
        ...prev,
        activeQuestionIndex: 0,
        status: 'STOPPED',
        activeQuestion: firstQ || prev.activeQuestion,
      } : null)
    } catch {} finally {
      setActionLoading(false)
    }
  }

  // Next category reveal in ceremony
  async function handleNextRevealCategory(nextIdx: number) {
    if (!hostKey || actionLoading || !room) return
    const categoriesCount = room.questions?.length || room.questionsList?.length || 0
    if (nextIdx < 0 || nextIdx >= categoriesCount) return

    setActionLoading(true)
    try {
      await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, action: 'switch', index: nextIdx }),
      })
      await fetch(`/api/poll/${roomCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, status: 'STOPPED' }),
      })
      const targetQ = room.questions ? room.questions[nextIdx] : null
      setRoom(prev => prev ? {
        ...prev,
        activeQuestionIndex: nextIdx,
        status: 'STOPPED',
        activeQuestion: targetQ || prev.activeQuestion,
      } : null)
    } catch {} finally {
      setActionLoading(false)
    }
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
    const currentQId = room.activeQuestion.id
    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostKey,
          action: 'save',
          questionData: {
            id: currentQId,
            title: editTitle.trim(),
            subtitle: editSubtitle.trim(),
            options: filteredOpts,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? {
          ...prev,
          activeQuestionIndex: data.activeQuestionIndex,
          activeQuestion: data.activeQuestion,
          questions: data.questions || prev.questions,
        } : null)
        setIsEditingQuestion(false)
      } else {
        alert(data.message || 'Failed to save category')
      }
    } catch {
      alert('Network error saving category')
    } finally {
      setActionLoading(false)
    }
  }

  // Add new blank question/category and navigate to it immediately
  async function handleAddNewQuestion() {
    if (!hostKey || actionLoading || !room) return
    setActionLoading(true)
    const totalCount = room.questions?.length || room.questionsList?.length || 1
    const newIdx = totalCount + 1
    const newQId = `q_${roomCode}_${Date.now()}`
    const defaultNewQ = {
      id: newQId,
      title: `Category ${newIdx}: Best Innovation`,
      subtitle: 'Honoring creativity and out-of-the-box thinking',
      options: [
        { text: 'Nominee A', description: 'Tech Team' },
        { text: 'Nominee B', description: 'Operations Team' },
      ],
    }

    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostKey,
          action: 'save',
          switchAfterSave: true,
          questionData: defaultNewQ,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? {
          ...prev,
          activeQuestionIndex: data.activeQuestionIndex,
          activeQuestion: data.activeQuestion,
          questions: data.questions,
          totalQuestions: data.questions?.length || totalCount + 1,
        } : null)
        // Automatically open editor for the new category so the host can customize it immediately
        setEditTitle(defaultNewQ.title)
        setEditSubtitle(defaultNewQ.subtitle)
        setEditOptions(defaultNewQ.options.map(o => ({ text: o.text, description: o.description })))
        setIsEditingQuestion(true)
      }
    } catch {} finally {
      setActionLoading(false)
    }
  }

  // Delete category
  async function handleDeleteQuestion(questionId: string) {
    if (!hostKey || actionLoading || !room) return
    const totalCount = room.questions?.length || room.questionsList?.length || 1
    if (totalCount <= 1) {
      alert('You must keep at least 1 category in the poll.')
      return
    }
    if (!confirm('Are you sure you want to delete this category? All its nominees and votes will be permanently removed.')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/poll/${roomCode}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostKey,
          action: 'delete',
          questionId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRoom(prev => prev ? {
          ...prev,
          activeQuestionIndex: data.activeQuestionIndex,
          activeQuestion: data.activeQuestion,
          questions: data.questions,
          totalQuestions: data.questions?.length || totalCount - 1,
        } : null)
        setIsEditingQuestion(false)
      } else {
        alert(data.message || 'Could not delete category')
      }
    } catch {
      alert('Network error deleting category')
    } finally {
      setActionLoading(false)
    }
  }

  // Reset votes for current category
  async function handleResetVotes() {
    if (!hostKey || actionLoading || !confirm('Reset all votes for this current category?')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/poll/${roomCode}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey, questionId: room?.activeQuestion?.id }),
      })
      const data = await res.json()
      if (data.success && room) {
        setRoom(prev => prev ? {
          ...prev,
          status: data.status,
          activeQuestion: data.activeQuestion || prev.activeQuestion,
        } : null)
      }
    } catch {} finally {
      setActionLoading(false)
    }
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
  const categoriesList = room.questions || (room.questionsList as any[]) || []
  const currentIdx = room.activeQuestionIndex
  const totalCategories = categoriesList.length

  const stageBadgeColor =
    currentStage === 'LIVE' ? '#4ade80' :
    currentStage === 'STOPPED' ? '#f87171' :
    currentStage === 'READY' ? '#fde047' :
    currentStage === 'COMPLETED' ? '#c084fc' : '#94a3b8'

  const stageBadgeLabel =
    currentStage === 'LIVE' ? '🟢 VOTING IN PROGRESS' :
    currentStage === 'STOPPED' ? '🛑 VOTING CLOSED' :
    currentStage === 'READY' ? '🟡 SHOWCASE (WAITING TO VOTE)' :
    currentStage === 'COMPLETED' ? '🏆 WINNER REVEALED' : '⚪ DRAFT (EDITING)'

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
          {/* Suspense Mode / Live Results toggle */}
          <button
            onClick={handleToggleSuspense}
            disabled={actionLoading}
            title="When Suspense Mode is active, live percentage bars and winners remain hidden on audience and projector screens until you reveal them!"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: room.showResultsLive ? 'rgba(59,130,246,0.18)' : 'rgba(168,85,247,0.22)',
              border: `1.5px solid ${room.showResultsLive ? '#60a5fa' : '#c084fc'}`,
              color: room.showResultsLive ? '#93c5fd' : '#e9d5ff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{room.showResultsLive ? '📊 Live Breakdown: ON' : '🎭 Suspense Mode: ACTIVE'}</span>
          </button>

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
                LIVE POLL CONTROLS
              </div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span>Status:</span>
                <span style={{ color: stageBadgeColor }}>{stageBadgeLabel}</span>
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
                <span>Reset Category Votes</span>
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
                height: 52,
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
                height: 52,
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

            {/* LIVE / START VOTING */}
            <button
              onClick={() => handleSetStatus('LIVE')}
              disabled={actionLoading}
              style={{
                height: 52,
                borderRadius: 14,
                border: currentStage === 'LIVE' ? '2px solid #22c55e' : '1px solid rgba(34,197,94,0.3)',
                background: currentStage === 'LIVE' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(34,197,94,0.12)',
                color: currentStage === 'LIVE' ? '#fff' : '#4ade80',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: currentStage === 'LIVE' ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
              }}
            >
              {currentStage === 'STOPPED' ? '▶ RE-OPEN VOTING' : '🟢 START VOTING'}
            </button>

            {/* STOP VOTING */}
            <button
              onClick={() => handleSetStatus('STOPPED')}
              disabled={actionLoading}
              style={{
                height: 52,
                borderRadius: 14,
                border: currentStage === 'STOPPED' ? '2px solid #ef4444' : '1px solid rgba(239,68,68,0.3)',
                background: currentStage === 'STOPPED' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(239,68,68,0.12)',
                color: currentStage === 'STOPPED' ? '#fff' : '#f87171',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: currentStage === 'STOPPED' ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
              }}
            >
              🛑 STOP VOTING
            </button>

            {/* COMPLETED */}
            <button
              onClick={() => handleSetStatus('COMPLETED')}
              disabled={actionLoading}
              style={{
                height: 52,
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
              🏆 REVEAL WINNER
            </button>
          </div>
        </section>

        {/* PROMINENT NEXT CATEGORY ACTION (Shows when voting is STOPPED or WINNER REVEALED) */}
        {(currentStage === 'STOPPED' || currentStage === 'COMPLETED') && (
          <section
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(255,200,87,0.18))',
              border: '2px solid #FFC857',
              borderRadius: 20,
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              boxShadow: '0 8px 30px rgba(255,200,87,0.2)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FFC857', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {currentStage === 'STOPPED'
                  ? (currentIdx === totalCategories - 1 ? '🎉 VOTING COMPLETE ACROSS ALL CATEGORIES!' : `🛑 VOTING CLOSED FOR CATEGORY #${currentIdx + 1}`)
                  : `🏆 WINNER CROWNED FOR CATEGORY #${currentIdx + 1}!`}
              </div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 19, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {currentStage === 'STOPPED' ? (
                  currentIdx < totalCategories - 1
                    ? `Next up: Category #${currentIdx + 2} — ${categoriesList[currentIdx + 1]?.title}`
                    : 'All audience ballots are safely locked in the database. Ready for the Award Ceremony?'
                ) : (
                  currentIdx < totalCategories - 1
                    ? `Next in Ceremony: Category #${currentIdx + 2} — ${categoriesList[currentIdx + 1]?.title}`
                    : '🎉 Grand Finale! All award categories have been celebrated and revealed! 🏆✨'
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* If STOPPED and not last: option to advance to next question or reveal immediately */}
              {currentStage === 'STOPPED' && currentIdx < totalCategories - 1 && (
                <>
                  <button
                    onClick={() => handleSetStatus('COMPLETED')}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'Fredoka, sans-serif',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(168,85,247,0.4)',
                    }}
                  >
                    🏆 Reveal Winner First
                  </button>
                  <button
                    onClick={handleNextCategory}
                    style={{
                      padding: '12px 26px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                      color: '#000',
                      border: 'none',
                      fontFamily: 'Fredoka, sans-serif',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 18px rgba(255,200,87,0.4)',
                    }}
                  >
                    <span>Advance to Next Category</span>
                    <span style={{ fontSize: 18 }}>➔</span>
                  </button>
                </>
              )}

              {/* If STOPPED and it is the last category: Start Results Reveal Ceremony from Category #1! */}
              {currentStage === 'STOPPED' && currentIdx === totalCategories - 1 && (
                <>
                  <button
                    onClick={() => handleSetStatus('COMPLETED')}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'Fredoka, sans-serif',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(168,85,247,0.4)',
                    }}
                  >
                    🏆 Reveal This Winner
                  </button>
                  <button
                    onClick={handleStartRevealCeremony}
                    style={{
                      padding: '12px 28px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                      color: '#000',
                      border: 'none',
                      fontFamily: 'Fredoka, sans-serif',
                      fontSize: 15,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 6px 24px rgba(255,200,87,0.5)',
                    }}
                  >
                    <span>🎤 Start Results Reveal Ceremony (from #1)</span>
                    <span style={{ fontSize: 18 }}>➔</span>
                  </button>
                </>
              )}

              {/* If COMPLETED and not last: Proceed to next category reveal */}
              {currentStage === 'COMPLETED' && currentIdx < totalCategories - 1 && (
                <button
                  onClick={() => handleNextRevealCategory(currentIdx + 1)}
                  style={{
                    padding: '12px 26px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                    color: '#000',
                    border: 'none',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 18px rgba(255,200,87,0.4)',
                  }}
                >
                  <span>Proceed to Category #{currentIdx + 2} Reveal</span>
                  <span style={{ fontSize: 18 }}>➔</span>
                </button>
              )}

              {/* If COMPLETED and last: Grand finale */}
              {currentStage === 'COMPLETED' && currentIdx === totalCategories - 1 && (
                <button
                  onClick={handleStartRevealCeremony}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                    color: '#fff',
                    border: 'none',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(168,85,247,0.4)',
                  }}
                >
                  <span>🔄 Revisit Ceremony from #1</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* QUESTIONS / CATEGORIES TABS */}
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 6,
            scrollbarWidth: 'thin',
          }}
        >
          {categoriesList.map((q, idx) => {
            const isTabActive = idx === currentIdx
            return (
              <button
                key={q.id || idx}
                onClick={() => handleSwitchQuestion(idx)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 14,
                  background: isTabActive ? 'linear-gradient(135deg, #FFC857, #FFA23A)' : 'rgba(255,255,255,0.06)',
                  color: isTabActive ? '#000' : '#fff',
                  border: isTabActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: isTabActive ? '0 4px 16px rgba(255,200,87,0.35)' : 'none',
                }}
              >
                <span style={{ opacity: isTabActive ? 0.8 : 0.5 }}>#{idx + 1}</span>
                <span>{q.title || `Category ${idx + 1}`}</span>
                <span style={{ fontSize: 11, background: isTabActive ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 999 }}>
                  {q.totalVotes || 0} votes
                </span>
              </button>
            )
          })}

          <button
            onClick={handleAddNewQuestion}
            disabled={actionLoading}
            style={{
              padding: '10px 18px',
              borderRadius: 14,
              background: 'rgba(255,200,87,0.12)',
              border: '1.5px dashed rgba(255,200,87,0.5)',
              color: '#FFC857',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: actionLoading ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>✨</span>
            <span>+ Add Category</span>
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
          {/* Quick Prev / Next Navigator for Categories */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => handleSwitchQuestion(currentIdx - 1)}
                disabled={currentIdx <= 0}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: currentIdx > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: currentIdx > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: currentIdx > 0 ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>←</span>
                <span>Prev Category</span>
              </button>

              <button
                onClick={() => handleSwitchQuestion(currentIdx + 1)}
                disabled={currentIdx >= totalCategories - 1}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: currentIdx < totalCategories - 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: currentIdx < totalCategories - 1 ? '#fff' : 'rgba(255,255,255,0.2)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: currentIdx < totalCategories - 1 ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>Next Category</span>
                <span>→</span>
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#ffd9b8', fontFamily: 'Fredoka, sans-serif' }}>
              Category <b>{currentIdx + 1}</b> of <b>{totalCategories}</b>
            </div>
          </div>

          {!isEditingQuestion ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ffd9b8', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    CATEGORY #{currentIdx + 1}
                  </div>
                  <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 26, fontWeight: 800, margin: '2px 0 4px', color: '#FFC857' }}>
                    {activeQ?.title}
                  </h2>
                  {activeQ?.subtitle && (
                    <div style={{ fontSize: 14, color: '#c4b5d4' }}>{activeQ.subtitle}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>✏️</span>
                    <span>Edit Nominees</span>
                  </button>

                  {totalCategories > 1 && activeQ && (
                    <button
                      onClick={() => handleDeleteQuestion(activeQ.id)}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 12,
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Nominees List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {activeQ?.options.map((opt, idx) => {
                  const isWinner = activeQ.winnerOptionId === opt.id
                  return (
                    <div
                      key={opt.id || idx}
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
                          width: `${opt.percentage || 0}%`,
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
                            {opt.percentage || 0}%
                          </div>
                        </div>

                        {opt.description && (
                          <div style={{ fontSize: 12, color: '#a89bc2', marginBottom: 8 }}>
                            {opt.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#ffd9b8' }}>
                          <span>{opt.votesCount || 0} {(opt.votesCount || 0) === 1 ? 'vote' : 'votes'}</span>
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
                  Edit Category #{currentIdx + 1}
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
                  CATEGORY / AWARD TITLE
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
                    NOMINEES / CANDIDATES
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditOptions([...editOptions, { text: '', description: '' }])}
                    style={{ background: 'none', border: 0, color: '#FFC857', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Nominee
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#ffd9b8', width: 24, textAlign: 'center' }}>{i + 1}.</span>
                      <input
                        type="text"
                        placeholder="Nominee / Option name"
                        value={opt.text}
                        onChange={e => {
                          const updated = [...editOptions]
                          updated[i].text = e.target.value
                          setEditOptions(updated)
                        }}
                        required
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 14 }}
                      />
                      <input
                        type="text"
                        placeholder="Subtitle / Department (optional)"
                        value={opt.description || ''}
                        onChange={e => {
                          const updated = [...editOptions]
                          updated[i].description = e.target.value
                          setEditOptions(updated)
                        }}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(10,3,20,0.7)', color: '#fff', fontSize: 14 }}
                      />
                      {editOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setEditOptions(editOptions.filter((_, idx) => idx !== i))}
                          style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: 13 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingQuestion(false)}
                  style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #FFC857, #FFA23A)', border: 'none', color: '#000', fontFamily: 'Fredoka, sans-serif', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Saving…' : 'Save Nominees'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1f0b35, #0c0217)',
              border: '2px solid rgba(255,200,87,0.4)',
              borderRadius: 24,
              padding: 28,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 800, color: '#FFC857', marginBottom: 4 }}>
              Audience Voting QR
            </div>
            <div style={{ fontSize: 13, color: '#d8b4fe', marginBottom: 20 }}>
              Scan to vote directly from your mobile phone!
            </div>

            {qrDataUrl && (
              <div style={{ display: 'inline-block', background: '#fff', padding: 14, borderRadius: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Voting QR Code" style={{ width: 260, height: 260, display: 'block' }} />
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#ffd9b8' }}>
                Poll Code: <b style={{ color: '#FFC857', fontSize: 16 }}>{roomCode}</b>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
