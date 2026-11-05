'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChoiceAwardsState, AwardCategory, AwardNominee, ChoiceAwardsMode, QuestionVotingState } from '@/lib/choiceAwards'

const QUICK_EMOJIS = ['👑', '⭐', '🚀', '💡', '🔥', '🏆', '🎯', '🦁', '💎', '🕶️', '🧙', '🎨', '🤖', '⚡', '🎉', '🌟']

export default function OrganizerChoiceAwardsPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'SETUP' | 'LIVE_CONTROL'>('SETUP')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Setup Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AwardCategory | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalSubtitle, setModalSubtitle] = useState('')
  const [modalNominees, setModalNominees] = useState<AwardNominee[]>([])
  const [modalError, setModalError] = useState('')

  // Quick Add Nominee Modal
  const [quickAddCatId, setQuickAddCatId] = useState<string | null>(null)
  const [quickNomName, setQuickNomName] = useState('')
  const [quickNomRole, setQuickNomRole] = useState('')
  const [quickNomAvatar, setQuickNomAvatar] = useState('⭐')
  const [quickNomPhoto, setQuickNomPhoto] = useState<string | null>(null)
  const [quickNomVideo, setQuickNomVideo] = useState<string | null>(null)

  // Polling for live sync
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const res = await fetch(`/api/choice-awards?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (isMounted && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {
        // network error
      }
    }

    loadData()
    const timer = setInterval(loadData, 2000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  // Auto-switch to LIVE_CONTROL if ceremony or live voting is in progress
  useEffect(() => {
    if (data?.mode === 'CEREMONY' || data?.questionVotingState === 'VOTING') {
      // Keep host informed, but don't force if they are editing
    }
  }, [data?.mode, data?.questionVotingState])

  // Live Control Action Dispatcher
  async function handleLiveAction(action: string, extra?: Record<string, any>) {
    setSaving(true)
    try {
      const res = await fetch('/api/choice-awards/live-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch (err) {
      console.error('Error executing live action:', err)
    } finally {
      setSaving(false)
    }
  }

  // Open Edit/Create Modal
  function handleOpenCreateModal() {
    setEditingCategory(null)
    setModalTitle('')
    setModalSubtitle('')
    setModalNominees([
      { id: `nom_${Date.now()}_1`, name: '', role: '', avatar: '⭐', photoUrl: null, videoUrl: null, votesCount: 0 },
      { id: `nom_${Date.now()}_2`, name: '', role: '', avatar: '🚀', photoUrl: null, videoUrl: null, votesCount: 0 },
    ])
    setModalError('')
    setShowEditModal(true)
  }

  function handleCloseEditModal() {
    setShowEditModal(false)
    setEditingCategory(null)
    setModalError('')
  }

  function handleOpenEditModal(cat: AwardCategory) {
    setEditingCategory(cat)
    setModalTitle(cat.title)
    setModalSubtitle(cat.subtitle || '')
    setModalNominees(
      cat.nominees.map(n => ({
        ...n,
        photoUrl: n.photoUrl || null,
        videoUrl: n.videoUrl || null,
      }))
    )
    setModalError('')
    setShowEditModal(true)
  }

  // File Upload Helper (Photo / Video to Base64)
  function handleFileUpload(
    file: File,
    type: 'photo' | 'video',
    nomineeIndex: number,
    isQuickAdd = false
  ) {
    if (type === 'video' && file.size > 25 * 1024 * 1024) {
      alert('Video file is larger than 25MB. Please choose a smaller clip or paste an external video link.')
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result as string
      if (isQuickAdd) {
        if (type === 'photo') setQuickNomPhoto(result)
        else setQuickNomVideo(result)
      } else {
        setModalNominees(prev => {
          const next = [...prev]
          if (type === 'photo') next[nomineeIndex].photoUrl = result
          else next[nomineeIndex].videoUrl = result
          return next
        })
      }
    }
    reader.readAsDataURL(file)
  }

  // Save Modal
  async function handleSaveModal() {
    const title = modalTitle.trim()
    if (!title) {
      setModalError('Please enter an award question or category title.')
      return
    }

    const validNominees = modalNominees.filter(n => n.name.trim() !== '')
    if (validNominees.length < 2) {
      setModalError('Please provide at least 2 nominees with valid names.')
      return
    }

    setSaving(true)
    setModalError('')

    const updatedCategories: AwardCategory[] = [...(data?.categories || [])]
    if (editingCategory) {
      const idx = updatedCategories.findIndex(c => c.id === editingCategory.id)
      if (idx !== -1) {
        updatedCategories[idx] = {
          ...editingCategory,
          title,
          subtitle: modalSubtitle.trim() || undefined,
          nominees: validNominees.map((n, i) => ({
            ...n,
            name: n.name.trim(),
            role: n.role?.trim() || undefined,
            avatar: n.avatar || '⭐',
            photoUrl: n.photoUrl || null,
            videoUrl: n.videoUrl || null,
          })),
        }
      } else {
        updatedCategories.push({
          id: editingCategory.id || `cat_${Date.now()}`,
          orderIndex: updatedCategories.length,
          title,
          subtitle: modalSubtitle.trim() || undefined,
          totalVotes: editingCategory.totalVotes || 0,
          nominees: validNominees.map(n => ({
            ...n,
            name: n.name.trim(),
            role: n.role?.trim() || undefined,
            avatar: n.avatar || '⭐',
            photoUrl: n.photoUrl || null,
            videoUrl: n.videoUrl || null,
          })),
        })
      }
    } else {
      const newCat: AwardCategory = {
        id: `cat_${Date.now()}`,
        orderIndex: updatedCategories.length,
        title,
        subtitle: modalSubtitle.trim() || undefined,
        totalVotes: 0,
        nominees: validNominees.map((n, i) => ({
          id: n.id || `nom_${Date.now()}_${i}`,
          name: n.name.trim(),
          role: n.role?.trim() || undefined,
          avatar: n.avatar || '⭐',
          photoUrl: n.photoUrl || null,
          videoUrl: n.videoUrl || null,
          votesCount: 0,
        })),
      }
      updatedCategories.push(newCat)
    }

    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setShowEditModal(false)
        const wasEditing = Boolean(editingCategory)
        setEditingCategory(null)
        setMsg(wasEditing ? 'Award updated successfully!' : 'New award created successfully!')
        setTimeout(() => setMsg(''), 3000)
      } else {
        setModalError(json.message || 'Failed to save category.')
      }
    } catch {
      setModalError('Network error while saving.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Category
  async function handleDeleteCategory(catId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return
    const updated = (data?.categories || []).filter(c => c.id !== catId)
    setSaving(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updated }),
      })
      const json = await res.json()
      if (json.success && json.data) setData(json.data)
    } finally {
      setSaving(false)
    }
  }

  // Move Category Reorder
  async function handleMove(index: number, direction: 'UP' | 'DOWN') {
    if (!data?.categories) return
    const targetIdx = direction === 'UP' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= data.categories.length) return

    const cats = [...data.categories]
    const temp = cats[index]
    cats[index] = cats[targetIdx]
    cats[targetIdx] = temp

    const reordered = cats.map((c, i) => ({ ...c, orderIndex: i }))
    setSaving(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: reordered }),
      })
      const json = await res.json()
      if (json.success && json.data) setData(json.data)
    } finally {
      setSaving(false)
    }
  }

  // Clear All Categories
  async function handleClearAll() {
    if (!confirm('Are you sure you want to delete ALL award questions? This will provide a blank slate.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: [] }),
      })
      const json = await res.json()
      if (json.success && json.data) setData(json.data)
    } finally {
      setSaving(false)
    }
  }

  // Full Reset Ballots
  async function handleResetAllBallots() {
    if (!confirm('Reset all cast ballots across all categories? This will set all vote counts to zero.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/choice-awards/reset', { method: 'POST' })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setMsg('All ballots successfully reset to 0!')
        setTimeout(() => setMsg(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const categories = data?.categories || []
  const activeCatIndex = categories.findIndex(c => c.id === data?.activeCategoryId)
  const currentActiveCat = activeCatIndex !== -1 ? categories[activeCatIndex] : categories[0] || null

  const ceremonyCatIndex = categories.findIndex(c => c.id === data?.ceremonyCategoryId)
  const currentCeremonyCat = ceremonyCatIndex !== -1 ? categories[ceremonyCatIndex] : categories[0] || null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0217 0%, #1a0826 40%, #2b0e3a 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '28px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 24,
            paddingBottom: 20,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>🏆</span>
              <div>
                <h1
                  style={{
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 'clamp(24px, 4vw, 32px)',
                    margin: 0,
                    background: 'linear-gradient(180deg, #fff0b3, #FFC857)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 700,
                  }}
                >
                  Choice Awards Studio
                </h1>
                <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 2 }}>
                  Set up questions, upload nominee photos & videos, run live voting one-by-one, and reveal Oscars ceremony results.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Screen Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/choice-awards/live"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(245,158,11,0.35)',
              }}
            >
              <span>📺</span>
              <span>Open Big Screen Display</span>
            </Link>

            <Link
              href="/vote"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(168,85,247,0.2)',
                border: '1.5px solid rgba(168,85,247,0.5)',
                color: '#e9d5ff',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              <span>🗳️</span>
              <span>Audience Ballot URL</span>
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {msg && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(34,197,94,0.2)',
              border: '1px solid #22c55e',
              color: '#86efac',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ✅ {msg}
          </div>
        )}

        {/* Studio Tabs: 1. Award Setup vs 2. Live Host Control */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            background: 'rgba(255,255,255,0.05)',
            padding: 6,
            borderRadius: 16,
            width: 'fit-content',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <button
            onClick={() => setActiveTab('SETUP')}
            style={{
              padding: '10px 22px',
              borderRadius: 12,
              border: 0,
              background: activeTab === 'SETUP' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
              color: activeTab === 'SETUP' ? '#fff' : '#cbd5e1',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .15s ease',
            }}
          >
            <span>🛠️</span>
            <span>1. Award Setup ({categories.length} Questions)</span>
          </button>

          <button
            onClick={() => setActiveTab('LIVE_CONTROL')}
            style={{
              padding: '10px 22px',
              borderRadius: 12,
              border: 0,
              background: activeTab === 'LIVE_CONTROL' ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'transparent',
              color: activeTab === 'LIVE_CONTROL' ? '#fff' : '#cbd5e1',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .15s ease',
            }}
          >
            <span>🎙️</span>
            <span>2. Live Host & Ceremony Control</span>
            {data?.questionVotingState === 'VOTING' && (
              <span style={{ background: '#22c55e', color: '#000', fontSize: 10, padding: '2px 6px', borderRadius: 999, fontWeight: 900 }}>
                LIVE
              </span>
            )}
            {data?.mode === 'CEREMONY' && (
              <span style={{ background: '#FFC857', color: '#000', fontSize: 10, padding: '2px 6px', borderRadius: 999, fontWeight: 900 }}>
                CEREMONY
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: AWARD SETUP */}
        {activeTab === 'SETUP' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: 0 }}>
                  Award Categories & Nominee Media
                </h2>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Add your custom award questions. Upload photos and nominee videos to play on the split-screen display.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {categories.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(239,68,68,0.4)',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#fca5a5',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Clear All
                  </button>
                )}
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                    color: '#fff',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255,107,53,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>➕</span>
                  <span>Create New Award</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {categories.length === 0 && (
              <div
                style={{
                  padding: '60px 24px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.03)',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
                <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, margin: '0 0 8px' }}>
                  No Award Categories Yet
                </h3>
                <p style={{ color: '#94a3b8', maxWidth: 460, margin: '0 auto 24px', fontSize: 14 }}>
                  Start fresh with your company or team awards. Click below to add your first award question, nominees, photos, and videos.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 14,
                    border: 0,
                    background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                    color: '#fff',
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(255,107,53,0.4)',
                  }}
                >
                  ➕ Create First Award
                </button>
              </div>
            )}

            {/* List of Category Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 20,
                    padding: '22px 24px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            background: 'rgba(255,200,87,0.15)',
                            color: '#FFC857',
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Question #{idx + 1}
                        </span>
                        <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 19, margin: 0, color: '#fff' }}>
                          {cat.title}
                        </h3>
                      </div>
                      {cat.subtitle && (
                        <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>{cat.subtitle}</div>
                      )}
                    </div>

                    {/* Category Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => handleMove(idx, 'UP')}
                        disabled={idx === 0}
                        title="Move Up"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 0,
                          color: '#fff',
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.3 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'DOWN')}
                        disabled={idx === categories.length - 1}
                        title="Move Down"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 0,
                          color: '#fff',
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          cursor: idx === categories.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === categories.length - 1 ? 0.3 : 1,
                        }}
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.12)',
                          border: 0,
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit Award
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.title)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#fca5a5',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Nominees Grid */}
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.06em' }}>
                      Nominees ({cat.nominees.length})
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {cat.nominees.map(nom => (
                        <div
                          key={nom.id}
                          style={{
                            background: 'rgba(10,3,20,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 14,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          {nom.photoUrl ? (
                            <img
                              src={nom.photoUrl}
                              alt={nom.name}
                              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #FFC857' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.1)',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 22,
                              }}
                            >
                              {nom.avatar || '⭐'}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {nom.name}
                            </div>
                            {nom.role && (
                              <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nom.role}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              {nom.photoUrl && (
                                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.2)', color: '#86efac', padding: '1px 5px', borderRadius: 4 }}>
                                  📷 Photo
                                </span>
                              )}
                              {nom.videoUrl && (
                                <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.2)', color: '#93c5fd', padding: '1px 5px', borderRadius: 4 }}>
                                  📹 Video
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE HOST & CEREMONY CONTROL */}
        {activeTab === 'LIVE_CONTROL' && (
          <div>
            {categories.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                <h3>No categories set up yet.</h3>
                <p style={{ color: '#94a3b8' }}>Please switch to the "Award Setup" tab and add at least one award question first.</p>
                <button
                  onClick={() => setActiveTab('SETUP')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    border: 0,
                    background: '#a855f7',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Go to Award Setup
                </button>
              </div>
            ) : (
              <div>
                {/* Mode Selector (Live Question Voting vs Ceremony Oscars Reveal) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    padding: '18px 24px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 18,
                    marginBottom: 24,
                    border: '1.5px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd9b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Current Stage Mode
                    </div>
                    <div style={{ fontSize: 20, fontFamily: 'Fredoka, sans-serif', fontWeight: 700, marginTop: 2 }}>
                      {data?.mode === 'CEREMONY' ? '🏆 The Oscars Ceremony (Results Reveal)' : '🗳️ Live Audience Voting (One-by-One)'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleLiveAction('SET_MODE', { mode: 'LIVE_VOTING' })}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 12,
                        border: 0,
                        background: data?.mode === 'LIVE_VOTING' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      🗳️ Switch to Live Voting Mode
                    </button>

                    <button
                      onClick={() => handleLiveAction('SET_MODE', { mode: 'CEREMONY' })}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 12,
                        border: 0,
                        background: data?.mode === 'CEREMONY' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.2)',
                        color: data?.mode === 'CEREMONY' ? '#fff' : '#fbbf24',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: data?.mode === 'CEREMONY' ? '0 4px 16px rgba(245,158,11,0.4)' : 'none',
                      }}
                    >
                      👑 Switch to Ceremony Reveal Mode
                    </button>
                  </div>
                </div>

                {/* SUB-SECTION A: LIVE QUESTION VOTING CONTROLS */}
                {data?.mode === 'LIVE_VOTING' && currentActiveCat && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '2px solid rgba(255,107,53,0.4)',
                      borderRadius: 24,
                      padding: '28px 24px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Active Question Bar & Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 28 }}>🎯</span>
                        <div>
                          <div style={{ fontSize: 13, color: '#FFC857', fontWeight: 700 }}>
                            ACTIVE QUESTION {activeCatIndex + 1} OF {categories.length}
                          </div>
                          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, margin: '2px 0 0' }}>
                            {currentActiveCat.title}
                          </h2>
                          {currentActiveCat.subtitle && (
                            <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 3 }}>{currentActiveCat.subtitle}</div>
                          )}
                        </div>
                      </div>

                      {/* Question Navigation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (activeCatIndex > 0) {
                              handleLiveAction('SET_ACTIVE_CATEGORY', { categoryId: categories[activeCatIndex - 1].id })
                            }
                          }}
                          disabled={activeCatIndex === 0}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.1)',
                            border: 0,
                            color: '#fff',
                            cursor: activeCatIndex === 0 ? 'not-allowed' : 'pointer',
                            opacity: activeCatIndex === 0 ? 0.3 : 1,
                            fontWeight: 700,
                          }}
                        >
                          ◀ Previous Question
                        </button>

                        <button
                          onClick={() => {
                            if (activeCatIndex < categories.length - 1) {
                              handleLiveAction('SET_ACTIVE_CATEGORY', { categoryId: categories[activeCatIndex + 1].id })
                            }
                          }}
                          disabled={activeCatIndex === categories.length - 1}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #FF9E2C, #FF6B35)',
                            border: 0,
                            color: '#fff',
                            cursor: activeCatIndex === categories.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: activeCatIndex === categories.length - 1 ? 0.3 : 1,
                            fontWeight: 700,
                          }}
                        >
                          Next Question ▶
                        </button>
                      </div>
                    </div>

                    {/* Voting State Controller */}
                    <div
                      style={{
                        background: 'rgba(10,3,20,0.6)',
                        borderRadius: 18,
                        padding: '20px 24px',
                        border: '1.5px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Question Status on Audience Phones
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background:
                                data?.questionVotingState === 'VOTING'
                                  ? '#22c55e'
                                  : data?.questionVotingState === 'PAUSED'
                                  ? '#f59e0b'
                                  : data?.questionVotingState === 'STOPPED'
                                  ? '#ef4444'
                                  : '#94a3b8',
                              boxShadow:
                                data?.questionVotingState === 'VOTING' ? '0 0 10px #22c55e' : 'none',
                            }}
                          />
                          <span style={{ fontSize: 18, fontFamily: 'Fredoka, sans-serif', fontWeight: 700 }}>
                            {data?.questionVotingState === 'VOTING' && 'VOTING IS OPEN (Audience Voting Now)'}
                            {data?.questionVotingState === 'PAUSED' && 'VOTING IS PAUSED'}
                            {data?.questionVotingState === 'STOPPED' && 'VOTING IS STOPPED'}
                            {data?.questionVotingState === 'IDLE' && 'IDLE (Waiting for Host to Start)'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Start, Pause, Resume, Stop, Reset */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {data?.questionVotingState === 'IDLE' && (
                          <button
                            onClick={() => handleLiveAction('START_VOTE')}
                            style={{
                              padding: '12px 24px',
                              borderRadius: 12,
                              border: 0,
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: '#fff',
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: 16,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                            }}
                          >
                            ▶️ Start Vote
                          </button>
                        )}

                        {data?.questionVotingState === 'VOTING' && (
                          <>
                            <button
                              onClick={() => handleLiveAction('PAUSE_VOTE')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: 0,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#fff',
                                fontFamily: 'Fredoka, sans-serif',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ⏸️ Pause Vote
                            </button>
                            <button
                              onClick={() => handleLiveAction('STOP_VOTE')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: 0,
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#fff',
                                fontFamily: 'Fredoka, sans-serif',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🛑 Stop Vote
                            </button>
                          </>
                        )}

                        {data?.questionVotingState === 'PAUSED' && (
                          <>
                            <button
                              onClick={() => handleLiveAction('RESUME_VOTE')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: 0,
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: '#fff',
                                fontFamily: 'Fredoka, sans-serif',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ▶️ Resume Vote
                            </button>
                            <button
                              onClick={() => handleLiveAction('STOP_VOTE')}
                              style={{
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: 0,
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#fff',
                                fontFamily: 'Fredoka, sans-serif',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🛑 Stop Vote
                            </button>
                          </>
                        )}

                        {data?.questionVotingState === 'STOPPED' && (
                          <button
                            onClick={() => handleLiveAction('START_VOTE')}
                            style={{
                              padding: '12px 20px',
                              borderRadius: 12,
                              border: 0,
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: '#fff',
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: 15,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            🔄 Re-open Voting
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm('Reset votes for this specific question? Audience can revote.')) {
                              handleLiveAction('RESET_QUESTION_VOTES', { categoryId: currentActiveCat.id })
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#cbd5e1',
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          Reset This Question
                        </button>
                      </div>
                    </div>

                    {/* Real-time Combined Vote Counter & Breakdown */}
                    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                      <div
                        style={{
                          background: 'rgba(255,200,87,0.12)',
                          border: '1.5px solid rgba(255,200,87,0.4)',
                          borderRadius: 16,
                          padding: '14px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        <div style={{ fontSize: 32 }}>🔥</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#FFC857', textTransform: 'uppercase' }}>
                            Combined Ballots Cast for this Question
                          </div>
                          <div style={{ fontSize: 28, fontFamily: 'Fredoka, sans-serif', fontWeight: 700, color: '#fff' }}>
                            {currentActiveCat.totalVotes} Votes
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', maxWidth: 400 }}>
                        💡 On the big screen preview, only this combined count is shown. Individual nominee votes remain sealed until you start the ceremony!
                      </div>
                    </div>

                    {/* Nominees overview with videos/photos */}
                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
                        Nominees in this Question:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                        {currentActiveCat.nominees.map(n => (
                          <div
                            key={n.id}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: 16,
                              padding: 16,
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {n.photoUrl ? (
                                <img src={n.photoUrl} alt={n.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                                  {n.avatar || '⭐'}
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{n.name}</div>
                                {n.role && <div style={{ fontSize: 12, color: '#94a3b8' }}>{n.role}</div>}
                              </div>
                            </div>

                            {/* Host-only Vote Insight */}
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#94a3b8' }}>Host Eye Count:</span>
                              <span style={{ fontWeight: 700, color: '#FFC857' }}>
                                {n.votesCount} votes ({n.percentage}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-SECTION B: CEREMONY OSCARS REVEAL CONTROLS */}
                {data?.mode === 'CEREMONY' && currentCeremonyCat && (
                  <div
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.2) 0%, rgba(20,5,30,0.9) 70%)',
                      border: '2px solid rgba(245,158,11,0.5)',
                      borderRadius: 24,
                      padding: '30px 24px',
                      boxShadow: '0 20px 60px rgba(245,158,11,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 36 }}>👑</span>
                        <div>
                          <div style={{ fontSize: 13, color: '#FFC857', fontWeight: 700 }}>
                            CEREMONY REVEAL {ceremonyCatIndex + 1} OF {categories.length}
                          </div>
                          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 26, margin: '2px 0 0', color: '#fff' }}>
                            {currentCeremonyCat.title}
                          </h2>
                          {currentCeremonyCat.subtitle && (
                            <div style={{ fontSize: 14, color: '#ffd9b8', marginTop: 4 }}>{currentCeremonyCat.subtitle}</div>
                          )}
                        </div>
                      </div>

                      {/* Ceremony Category Switcher */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (ceremonyCatIndex > 0) {
                              handleLiveAction('SET_CEREMONY_CATEGORY', { categoryId: categories[ceremonyCatIndex - 1].id })
                            }
                          }}
                          disabled={ceremonyCatIndex === 0}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.1)',
                            border: 0,
                            color: '#fff',
                            cursor: ceremonyCatIndex === 0 ? 'not-allowed' : 'pointer',
                            opacity: ceremonyCatIndex === 0 ? 0.3 : 1,
                            fontWeight: 700,
                          }}
                        >
                          ◀ Previous Award
                        </button>
                        <button
                          onClick={() => {
                            if (ceremonyCatIndex < categories.length - 1) {
                              handleLiveAction('SET_CEREMONY_CATEGORY', { categoryId: categories[ceremonyCatIndex + 1].id })
                            }
                          }}
                          disabled={ceremonyCatIndex === categories.length - 1}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 0,
                            color: '#fff',
                            cursor: ceremonyCatIndex === categories.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: ceremonyCatIndex === categories.length - 1 ? 0.3 : 1,
                            fontWeight: 700,
                          }}
                        >
                          Next Award ▶
                        </button>
                      </div>
                    </div>

                    {/* The Grand Reveal Action Bar */}
                    <div
                      style={{
                        padding: '24px 20px',
                        background: 'rgba(10,3,20,0.7)',
                        borderRadius: 20,
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        textAlign: 'center',
                        marginBottom: 24,
                      }}
                    >
                      {!data?.ceremonyRevealed ? (
                        <div>
                          <div style={{ fontSize: 16, color: '#ffd9b8', marginBottom: 14 }}>
                            ✉️ Golden Envelope is sealed on the live screen. Click below to open it!
                          </div>
                          <button
                            onClick={() => handleLiveAction('REVEAL_CEREMONY')}
                            style={{
                              padding: '16px 36px',
                              borderRadius: 16,
                              border: 0,
                              background: 'linear-gradient(135deg, #FFC857 0%, #FFA23A 50%, #e8962a 100%)',
                              color: '#000',
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: 20,
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 8px 30px rgba(255,200,87,0.5)',
                              letterSpacing: '.02em',
                            }}
                          >
                            ✉️ OPEN GOLDEN ENVELOPE & REVEAL WINNER! 🏆
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 18, color: '#86efac', fontWeight: 700, marginBottom: 8 }}>
                            ✅ Golden Envelope is opened on the live screen!
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 14 }}>
                            Audience and projector are displaying the opened envelope, winner reveal, and vote breakdown.
                          </div>
                          <button
                            onClick={() => handleLiveAction('SET_CEREMONY_CATEGORY', { categoryId: currentCeremonyCat.id })}
                            style={{
                              padding: '8px 18px',
                              borderRadius: 10,
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#cbd5e1',
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            🔄 Re-seal Envelope
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Breakdown & Winner Stats preview */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#FFC857', marginBottom: 12 }}>
                        Current Award Rankings & Vote Transparency:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                        {[...currentCeremonyCat.nominees]
                          .sort((a, b) => b.votesCount - a.votesCount)
                          .map((n, rankIdx) => {
                            const isWinner = rankIdx === 0 && n.votesCount > 0
                            return (
                              <div
                                key={n.id}
                                style={{
                                  background: isWinner ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                                  border: isWinner ? '2px solid #FFC857' : '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 16,
                                  padding: 16,
                                  boxShadow: isWinner ? '0 8px 24px rgba(245,158,11,0.25)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      background: isWinner ? '#FFC857' : 'rgba(255,255,255,0.1)',
                                      color: isWinner ? '#000' : '#fff',
                                    }}
                                  >
                                    {isWinner ? '👑 1st (WINNER)' : `#${rankIdx + 1} PLACE`}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: 16, color: '#FFC857' }}>
                                    {n.votesCount} votes
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {n.photoUrl ? (
                                    <img src={n.photoUrl} alt={n.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                                      {n.avatar || '⭐'}
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{n.name}</div>
                                    {n.role && <div style={{ fontSize: 12, color: '#94a3b8' }}>{n.role}</div>}
                                  </div>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${n.percentage}%`,
                                        background: isWinner ? 'linear-gradient(90deg, #FFC857, #FFA23A)' : '#a855f7',
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    <span>Turnout Share</span>
                                    <span style={{ fontWeight: 700, color: '#fff' }}>{n.percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,1,10,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 100,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) handleCloseEditModal()
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'linear-gradient(145deg, #1f0b2e 0%, #10031a 100%)',
              border: '1.5px solid rgba(255,200,87,0.3)',
              borderRadius: 24,
              padding: '28px 24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>🏆</span>
                <div>
                  <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, margin: 0 }}>
                    {editingCategory ? 'Edit Award Question & Nominees' : 'Create New Award Question'}
                  </h3>
                  <div style={{ fontSize: 13, color: '#ffd9b8' }}>
                    Configure the award title, nominees, and attach photos or videos.
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseEditModal}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
                {modalError}
              </div>
            )}

            {/* Award Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6, textTransform: 'uppercase' }}>
                Award Question / Category Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Star Performer of the Year 🌟"
                value={modalTitle}
                onChange={e => setModalTitle(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  background: 'rgba(10,3,20,0.6)',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>

            {/* Award Subtitle */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6, textTransform: 'uppercase' }}>
                Subtitle / Question Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Consistently delivered outstanding excellence and team spirit"
                value={modalSubtitle}
                onChange={e => setModalSubtitle(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  background: 'rgba(10,3,20,0.6)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {/* Nominees List */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#ffd9b8', textTransform: 'uppercase' }}>
                  Nominees List (Minimum 2)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setModalNominees(prev => [
                      ...prev,
                      {
                        id: `nom_${Date.now()}_${prev.length + 1}`,
                        name: '',
                        role: '',
                        avatar: QUICK_EMOJIS[prev.length % QUICK_EMOJIS.length],
                        photoUrl: null,
                        videoUrl: null,
                        votesCount: 0,
                      },
                    ])
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(34,197,94,0.2)',
                    border: '1px solid #22c55e',
                    color: '#86efac',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ➕ Add Another Nominee
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {modalNominees.map((nom, nIdx) => (
                  <div
                    key={nom.id || nIdx}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFC857' }}>
                        Nominee #{nIdx + 1}
                      </span>
                      {modalNominees.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalNominees(prev => prev.filter((_, i) => i !== nIdx))
                          }}
                          style={{
                            background: 'transparent',
                            border: 0,
                            color: '#f87171',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Remove Nominee
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                      <div>
                        <input
                          type="text"
                          placeholder="Nominee Name (e.g. John Doe / Team Alpha)"
                          value={nom.name}
                          onChange={e => {
                            const val = e.target.value
                            setModalNominees(prev => {
                              const next = [...prev]
                              next[nIdx].name = val
                              return next
                            })
                          }}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(10,3,20,0.6)',
                            color: '#fff',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Role / Title (e.g. Senior Architect)"
                          value={nom.role || ''}
                          onChange={e => {
                            const val = e.target.value
                            setModalNominees(prev => {
                              const next = [...prev]
                              next[nIdx].role = val
                              return next
                            })
                          }}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(10,3,20,0.6)',
                            color: '#fff',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Media Uploads: Photo & Video */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      {/* Photo Uploader */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: 12,
                          padding: 10,
                          border: '1px dashed rgba(255,255,255,0.15)',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                          📷 Nominee Photo (JPG/PNG)
                        </div>
                        {nom.photoUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={nom.photoUrl} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => {
                                setModalNominees(prev => {
                                  const next = [...prev]
                                  next[nIdx].photoUrl = null
                                  return next
                                })
                              }}
                              style={{ background: 'rgba(239,68,68,0.2)', border: 0, color: '#fca5a5', fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                            >
                              Remove Photo
                            </button>
                          </div>
                        ) : (
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.1)',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => {
                                if (e.target.files?.[0]) {
                                  handleFileUpload(e.target.files[0], 'photo', nIdx)
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Video Uploader / URL */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: 12,
                          padding: 10,
                          border: '1px dashed rgba(255,255,255,0.15)',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                          📹 Nominee Video (MP4/WebM)
                        </div>
                        {nom.videoUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <video src={nom.videoUrl} style={{ width: 64, height: 40, borderRadius: 6, objectFit: 'cover' }} autoPlay muted loop />
                            <button
                              type="button"
                              onClick={() => {
                                setModalNominees(prev => {
                                  const next = [...prev]
                                  next[nIdx].videoUrl = null
                                  return next
                                })
                              }}
                              style={{ background: 'rgba(239,68,68,0.2)', border: 0, color: '#fca5a5', fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                            >
                              Remove Video
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: 'rgba(59,130,246,0.2)',
                                border: '1px solid rgba(59,130,246,0.4)',
                                color: '#bfdbfe',
                                fontSize: 12,
                                cursor: 'pointer',
                                width: 'fit-content',
                              }}
                            >
                              <span>Upload Video Clip</span>
                              <input
                                type="file"
                                accept="video/*"
                                style={{ display: 'none' }}
                                onChange={e => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(e.target.files[0], 'video', nIdx)
                                  }
                                }}
                              />
                            </label>
                            <input
                              type="text"
                              placeholder="Or paste video link (mp4/webm)"
                              value={nom.videoUrl || ''}
                              onChange={e => {
                                const val = e.target.value
                                setModalNominees(prev => {
                                  const next = [...prev]
                                  next[nIdx].videoUrl = val || null
                                  return next
                                })
                              }}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(10,3,20,0.6)',
                                color: '#fff',
                                fontSize: 12,
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#cbd5e1',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveModal}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(255,107,53,0.4)',
                }}
              >
                {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Award'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
