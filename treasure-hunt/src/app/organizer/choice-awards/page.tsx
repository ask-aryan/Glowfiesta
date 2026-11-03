'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AwardCategory, AwardNominee, ChoiceAwardsState } from '@/lib/choiceAwards'

const PRESET_EMOJIS = ['👑', '⭐', '🚀', '💡', '🔥', '🏆', '🎯', '🦁', '💎', '🕶️', '🧙', '🎨', '🤖', '⚡', '🌟', '🪄']

const AWARD_TEMPLATES = [
  { title: 'Best Code Ninja 🥷', subtitle: 'Excellence in clean architecture, speed & innovation' },
  { title: 'Star Performer of the Year ⭐', subtitle: 'Outstanding contribution across key deliverables' },
  { title: 'Best Team Player & Culture Champion 🤝', subtitle: 'Always ready to support and lift others up' },
  { title: 'Rising Star 2026 🚀', subtitle: 'Fastest growing talent making massive impact' },
  { title: 'Customer Delight Hero 💫', subtitle: 'Going above and beyond for user happiness' },
]

export default function ChoiceAwardsAdminPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Award Modal state (Create & Edit)
  const [showModal, setShowModal] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formSubtitle, setFormSubtitle] = useState('')
  const [formNominees, setFormNominees] = useState<{ id?: string; name: string; role: string; avatar: string }[]>([])
  const [formError, setFormError] = useState('')

  // Quick Add Nominee inline modal state
  const [quickAddCatId, setQuickAddCatId] = useState<string | null>(null)
  const [quickNomName, setQuickNomName] = useState('')
  const [quickNomRole, setQuickNomRole] = useState('')
  const [quickNomAvatar, setQuickNomAvatar] = useState('⭐')

  const fetchAwards = async () => {
    try {
      const res = await fetch('/api/choice-awards')
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // network glitch
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAwards()
    const timer = setInterval(fetchAwards, 2000)
    return () => clearInterval(timer)
  }, [])

  // Generate QR Code for /vote
  useEffect(() => {
    if (typeof window === 'undefined') return
    const voteUrl = `${window.location.origin}/vote`
    import('qrcode')
      .then(QRCode => {
        QRCode.toDataURL(voteUrl, {
          width: 360,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        })
          .then(url => setQrDataUrl(url))
          .catch(() => {})
      })
      .catch(() => {})
  }, [])

  const handleToggleStatus = async () => {
    if (!data || actionLoading) return
    const nextStatus = data.status === 'LIVE' ? 'CLOSED' : 'LIVE'
    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setStatusMsg(
          nextStatus === 'LIVE'
            ? '✅ Voting is now LIVE! Audience can submit ballots.'
            : '🔒 Voting has been STOPPED. No new ballots will be accepted.'
        )
        setTimeout(() => setStatusMsg(''), 4000)
      }
    } catch {
      alert('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetBallots = async () => {
    if (!confirm('Are you sure you want to CLEAR ALL BALLOTS? This will delete all votes cast so far!')) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/reset', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setStatusMsg('🧹 All ballots cleared successfully!')
        setTimeout(() => setStatusMsg(''), 4000)
      }
    } catch {
      alert('Failed to reset ballots')
    } finally {
      setActionLoading(false)
    }
  }

  // Open modal to create brand new award
  const handleOpenCreateModal = () => {
    setEditingCatId(null)
    setFormTitle('')
    setFormSubtitle('')
    setFormNominees([
      { id: `nom_${Date.now()}_1`, name: '', role: '', avatar: '👑' },
      { id: `nom_${Date.now()}_2`, name: '', role: '', avatar: '🚀' },
    ])
    setFormError('')
    setShowModal(true)
  }

  // Open modal to edit existing award
  const handleOpenEditModal = (cat: AwardCategory) => {
    setEditingCatId(cat.id)
    setFormTitle(cat.title)
    setFormSubtitle(cat.subtitle || '')
    setFormNominees(
      cat.nominees.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role || '',
        avatar: n.avatar || '⭐',
      }))
    )
    setFormError('')
    setShowModal(true)
  }

  // Save Award from Modal (Create or Update)
  const handleSaveAwardModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formTitle.trim()) {
      setFormError('Please enter an Award Title / Question.')
      return
    }

    const validNominees = formNominees.filter(n => n.name.trim().length > 0)
    if (validNominees.length < 2) {
      setFormError('Please add at least 2 nominees for this award category.')
      return
    }

    if (!data) return
    setActionLoading(true)

    try {
      let updatedCategories: AwardCategory[] = []

      if (editingCatId) {
        // Edit existing
        updatedCategories = data.categories.map(cat => {
          if (cat.id !== editingCatId) return cat
          return {
            ...cat,
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            nominees: validNominees.map((n, idx) => ({
              id: n.id || `nom_${Date.now()}_${idx}`,
              name: n.name.trim(),
              role: n.role.trim(),
              avatar: n.avatar || '⭐',
              votesCount: (cat.nominees.find(old => old.id === n.id)?.votesCount) || 0,
            })),
          }
        })
      } else {
        // Create new
        const newCat: AwardCategory = {
          id: `cat_${Date.now()}`,
          orderIndex: data.categories.length,
          title: formTitle.trim(),
          subtitle: formSubtitle.trim(),
          totalVotes: 0,
          nominees: validNominees.map((n, idx) => ({
            id: n.id || `nom_${Date.now()}_${idx}`,
            name: n.name.trim(),
            role: n.role.trim(),
            avatar: n.avatar || '⭐',
            votesCount: 0,
          })),
        }
        updatedCategories = [...data.categories, newCat]
      }

      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      })
      const json = await res.json()

      if (json.success) {
        setData(json.data)
        setShowModal(false)
        setStatusMsg(editingCatId ? '✅ Award updated successfully!' : '🎉 New Award category created successfully!')
        setTimeout(() => setStatusMsg(''), 4000)
      } else {
        setFormError(json.message || 'Failed to save award')
      }
    } catch {
      setFormError('Network error while saving award')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete an entire category
  const handleDeleteCategory = async (catId: string, title: string) => {
    if (!confirm(`Delete award category "${title}" and all its nominees?`)) return
    if (!data) return
    setActionLoading(true)

    try {
      const remaining = data.categories.filter(c => c.id !== catId)
      if (remaining.length === 0) {
        alert('You must have at least one award category.')
        setActionLoading(false)
        return
      }

      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: remaining }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setStatusMsg(`🗑️ Award category deleted`)
        setTimeout(() => setStatusMsg(''), 4000)
      }
    } catch {
      alert('Failed to delete category')
    } finally {
      setActionLoading(false)
    }
  }

  // Re-order category (move up or down)
  const handleMoveCategory = async (idx: number, direction: 'UP' | 'DOWN') => {
    if (!data) return
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= data.categories.length) return

    const copy = [...data.categories]
    const temp = copy[idx]
    copy[idx] = copy[targetIdx]
    copy[targetIdx] = temp

    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: copy }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      alert('Failed to reorder categories')
    } finally {
      setActionLoading(false)
    }
  }

  // Quick Add Nominee directly to a category
  const handleQuickAddNomineeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickNomName.trim() || !quickAddCatId || !data) return

    const updatedCategories = data.categories.map(cat => {
      if (cat.id !== quickAddCatId) return cat
      const newNom: AwardNominee = {
        id: `nom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: quickNomName.trim(),
        role: quickNomRole.trim(),
        avatar: quickNomAvatar || '⭐',
        votesCount: 0,
      }
      return {
        ...cat,
        nominees: [...cat.nominees, newNom],
      }
    })

    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setQuickAddCatId(null)
        setQuickNomName('')
        setQuickNomRole('')
        setStatusMsg(`✅ Added "${quickNomName}" to nominees!`)
        setTimeout(() => setStatusMsg(''), 4000)
      }
    } catch {
      alert('Failed to add nominee')
    } finally {
      setActionLoading(false)
    }
  }

  // Remove single nominee from a category
  const handleRemoveNominee = async (catId: string, nomId: string, nomName: string) => {
    if (!data) return
    const targetCat = data.categories.find(c => c.id === catId)
    if (!targetCat) return

    if (targetCat.nominees.length <= 2) {
      alert('An award category must have at least 2 nominees for voting.')
      return
    }

    if (!confirm(`Remove nominee "${nomName}"?`)) return

    const updatedCategories = data.categories.map(cat => {
      if (cat.id !== catId) return cat
      return {
        ...cat,
        nominees: cat.nominees.filter(n => n.id !== nomId),
      }
    })

    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      alert('Failed to remove nominee')
    } finally {
      setActionLoading(false)
    }
  }

  const isLive = data?.status === 'LIVE'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'linear-gradient(135deg, #181124 0%, #291b3f 50%, #150921 100%)',
          border: '1px solid rgba(255,200,87,0.35)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#fff',
          boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -30, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.18), transparent 70%)', pointerEvents: 'none' }} />

        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,200,87,0.15)', border: '1px solid rgba(255,200,87,0.35)', color: '#FFC857', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>🏆 OFFICIAL OSCARS EDITION</span>
          </div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 28, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 85%, #FF6B35 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Choice Awards Control Center
          </h1>
          <p style={{ color: '#d8c7ed', fontSize: 14, margin: 0, maxWidth: 600 }}>
            Create custom awards and nominees, collect audience ballots anonymously, and project the Oscars winner reveal on the stage big screen!
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 22px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFC857 0%, #FFA23A 60%, #FF6B35 100%)',
              color: '#1a052e',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              border: 0,
              boxShadow: '0 6px 20px rgba(255,200,87,0.45)',
            }}
          >
            <span>➕</span>
            <span>Create New Award</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>📱 Voting Link & QR</span>
          </button>

          <Link
            href="/choice-awards/live"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: 'rgba(255,200,87,0.15)',
              border: '1px solid rgba(255,200,87,0.4)',
              color: '#FFC857',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>🏆 Oscars Stage ↗</span>
          </Link>
        </div>
      </div>

      {/* 3-Step Flow Guide */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef2ff', color: '#4f46e5', fontWeight: 800, fontSize: 16, display: 'grid', placeItems: 'center' }}>
            1
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Setup Awards & Nominees</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{data?.categories.length || 0} questions configured</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: isLive ? '#dcfce7' : '#fef3c7', color: isLive ? '#15803d' : '#b45309', fontWeight: 800, fontSize: 16, display: 'grid', placeItems: 'center' }}>
            2
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Audience Voting ({isLive ? 'Active' : 'Closed'})</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{data?.totalBallots || 0} total ballots received</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef3c7', color: '#d97706', fontWeight: 800, fontSize: 16, display: 'grid', placeItems: 'center' }}>
            3
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Oscars Reveal Night</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>One-by-one card flip on projector</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '12px 18px', borderRadius: 12, fontWeight: 600, marginBottom: 20 }}>
          {statusMsg}
        </div>
      )}

      {/* Control Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Status Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Audience Voting Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                background: isLive ? '#dcfce7' : '#fee2e2',
                color: isLive ? '#15803d' : '#b91c1c',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#22c55e' : '#ef4444' }} />
              {isLive ? 'ACCEPTING RESPONSES' : 'RESPONSES STOPPED'}
            </span>
            <button
              onClick={handleToggleStatus}
              disabled={actionLoading}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: 0,
                background: isLive ? '#ef4444' : '#16a34a',
                color: '#fff',
              }}
            >
              {isLive ? 'Stop Accepting' : 'Start Accepting'}
            </button>
          </div>
        </div>

        {/* Total Ballots Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            Total Ballots Cast
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
              {data?.totalBallots || 0}
            </div>
            <button
              onClick={handleResetBallots}
              disabled={actionLoading}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              🧹 Clear All Ballots
            </button>
          </div>
        </div>

        {/* Total Questions Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            Award Categories
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
              {data?.categories.length || 0}
            </div>
            <button
              onClick={handleOpenCreateModal}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 0,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ➕ Add Award
            </button>
          </div>
        </div>
      </div>

      {/* Categories & Nominees Section */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Award Questions & Nominees Lineup
            </h2>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Audience sees these in the single voting form. Use the buttons on each card to edit, re-order, or add nominees.
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              borderRadius: 10,
              background: '#0f172a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: 0,
              boxShadow: '0 2px 8px rgba(15,23,42,0.15)',
            }}
          >
            <span>➕ Create New Award</span>
          </button>
        </div>

        {/* Categories List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Loading Choice Awards configuration…
          </div>
        ) : (data?.categories || []).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>No Awards Configured Yet</div>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Click the button below to create your first award category and nominees!
            </p>
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: '#0f172a',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 0,
                cursor: 'pointer',
              }}
            >
              ➕ Create First Award
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {data?.categories.map((cat, cIdx) => (
              <div
                key={cat.id || cIdx}
                style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 18,
                  padding: '22px 24px',
                  background: '#fafafa',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                {/* Category Header Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#d97706', letterSpacing: '.06em', textTransform: 'uppercase', background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>
                        QUESTION {cIdx + 1} OF {data.categories.length}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                        • {cat.totalVotes} votes cast
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{cat.title}</div>
                    {cat.subtitle && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{cat.subtitle}</div>}
                  </div>

                  {/* Actions for this category */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Reorder Buttons */}
                    <button
                      onClick={() => handleMoveCategory(cIdx, 'UP')}
                      disabled={cIdx === 0}
                      title="Move Up in Oscars sequence"
                      style={{
                        padding: '5px 9px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: cIdx === 0 ? 'not-allowed' : 'pointer',
                        opacity: cIdx === 0 ? 0.4 : 1,
                        fontSize: 12,
                      }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveCategory(cIdx, 'DOWN')}
                      disabled={cIdx === data.categories.length - 1}
                      title="Move Down in Oscars sequence"
                      style={{
                        padding: '5px 9px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: cIdx === data.categories.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: cIdx === data.categories.length - 1 ? 0.4 : 1,
                        fontSize: 12,
                      }}
                    >
                      ▼
                    </button>

                    {/* Quick Add Nominee */}
                    <button
                      onClick={() => {
                        setQuickAddCatId(cat.id)
                        setQuickNomName('')
                        setQuickNomRole('')
                        setQuickNomAvatar('⭐')
                      }}
                      style={{
                        background: '#eef2ff',
                        color: '#4f46e5',
                        border: '1px solid #c7d2fe',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>+ Add Nominee</span>
                    </button>

                    {/* Edit Award Modal Button */}
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      style={{
                        background: '#fff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>✏️ Edit Award</span>
                    </button>

                    {/* Delete Award */}
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.title)}
                      title="Delete category"
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Nominees Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {cat.nominees.map((nom, nIdx) => (
                    <div
                      key={nom.id || nIdx}
                      style={{
                        background: '#fff',
                        border: nom.id === cat.winnerNomineeId && cat.totalVotes > 0
                          ? '2px solid #f59e0b'
                          : '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        position: 'relative',
                        boxShadow: nom.id === cat.winnerNomineeId && cat.totalVotes > 0
                          ? '0 4px 14px rgba(245,158,11,0.18)'
                          : 'none',
                      }}
                    >
                      <div style={{ fontSize: 26, width: 38, height: 38, borderRadius: 10, background: '#f8fafc', display: 'grid', placeItems: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                        {nom.avatar || '⭐'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {nom.name}
                          </div>
                          {cat.nominees.length > 2 && (
                            <button
                              onClick={() => handleRemoveNominee(cat.id, nom.id, nom.name)}
                              title="Remove nominee"
                              style={{
                                background: 'none',
                                border: 0,
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: 14,
                                padding: '2px 4px',
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {nom.role && <div style={{ fontSize: 12, color: '#64748b' }}>{nom.role}</div>}

                        {/* Vote bar */}
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                            <span>{nom.votesCount} {nom.votesCount === 1 ? 'vote' : 'votes'}</span>
                            <span style={{ fontWeight: 600 }}>{nom.percentage || 0}%</span>
                          </div>
                          <div style={{ height: 6, width: '100%', background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${nom.percentage || 0}%`,
                                background: nom.id === cat.winnerNomineeId && cat.totalVotes > 0 ? '#f59e0b' : '#3b82f6',
                                borderRadius: 999,
                                transition: 'width .4s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT AWARD MODAL */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: '28px',
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {editingCatId ? 'EDIT AWARD QUESTION' : 'CREATE NEW AWARD'}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: '#0f172a' }}>
                  {editingCatId ? 'Edit Award & Nominees' : 'Create New Award Question'}
                </h2>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Set up the question and the nominees the audience can choose from.
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Template Presets (when creating new) */}
            {!editingCatId && (
              <div style={{ marginBottom: 18, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Quick Fill Preset Examples:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AWARD_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => {
                        setFormTitle(tpl.title)
                        setFormSubtitle(tpl.subtitle)
                      }}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveAwardModal}>
              {/* Question / Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  AWARD QUESTION / TITLE <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Star Performer of the Year ⭐"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 15,
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Subtitle / Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  DESCRIPTION / CRITERIA (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Celebrated for exceptional leadership and high-impact deliverables"
                  value={formSubtitle}
                  onChange={e => setFormSubtitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Nominees Builder */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    NOMINEES ({formNominees.length}) <span style={{ color: '#ef4444' }}>* (Minimum 2)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormNominees(prev => [
                        ...prev,
                        { id: `nom_${Date.now()}_${prev.length + 1}`, name: '', role: '', avatar: '⭐' },
                      ])
                    }}
                    style={{
                      background: '#eef2ff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Nominee
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {formNominees.map((nom, nIdx) => (
                    <div
                      key={nom.id || nIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '10px 12px',
                      }}
                    >
                      {/* Avatar Picker */}
                      <input
                        type="text"
                        value={nom.avatar}
                        onChange={e => {
                          const val = e.target.value
                          setFormNominees(prev => {
                            const copy = [...prev]
                            copy[nIdx].avatar = val
                            return copy
                          })
                        }}
                        title="Emoji Avatar"
                        style={{
                          width: 38,
                          height: 38,
                          textAlign: 'center',
                          fontSize: 18,
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                        }}
                      />

                      {/* Name */}
                      <input
                        type="text"
                        placeholder={`Nominee ${nIdx + 1} Name *`}
                        value={nom.name}
                        onChange={e => {
                          const val = e.target.value
                          setFormNominees(prev => {
                            const copy = [...prev]
                            copy[nIdx].name = val
                            return copy
                          })
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          fontWeight: 600,
                          background: '#fff',
                        }}
                      />

                      {/* Role */}
                      <input
                        type="text"
                        placeholder="Role / Team (e.g. Backend)"
                        value={nom.role}
                        onChange={e => {
                          const val = e.target.value
                          setFormNominees(prev => {
                            const copy = [...prev]
                            copy[nIdx].role = val
                            return copy
                          })
                        }}
                        style={{
                          width: 150,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      />

                      {/* Delete Nominee */}
                      {formNominees.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormNominees(prev => prev.filter((_, i) => i !== nIdx))
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: 0,
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Emoji Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Quick Emojis:</span>
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        // Apply to the first nominee with empty or default avatar
                        setFormNominees(prev => {
                          const copy = [...prev]
                          if (copy.length > 0) copy[copy.length - 1].avatar = em
                          return copy
                        })
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 0,
                    background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                    color: '#1a052e',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(255,200,87,0.4)',
                  }}
                >
                  {actionLoading ? 'Saving Award…' : editingCatId ? 'Save Changes 🏆' : 'Create & Save Award 🏆'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD NOMINEE MODAL */}
      {quickAddCatId && (
        <div
          onClick={() => setQuickAddCatId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Add Nominee to Award
              </h3>
              <button
                onClick={() => setQuickAddCatId(null)}
                style={{
                  background: '#f1f5f9',
                  border: 0,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddNomineeSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  NOMINEE NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Team Alpha"
                  value={quickNomName}
                  onChange={e => setQuickNomName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  ROLE / DEPARTMENT (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Engineering"
                  value={quickNomRole}
                  onChange={e => setQuickNomRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  AVATAR EMOJI
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    value={quickNomAvatar}
                    onChange={e => setQuickNomAvatar(e.target.value)}
                    style={{
                      width: 44,
                      height: 40,
                      textAlign: 'center',
                      fontSize: 20,
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {PRESET_EMOJIS.slice(0, 8).map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setQuickNomAvatar(em)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setQuickAddCatId(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 0,
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Adding…' : 'Add Nominee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal for Audience Voting Link */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 32,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗳️</div>
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
              Choice Awards Voting QR
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
              Project this QR or print it on tables for the audience to vote anonymously on their mobile phones!
            </p>

            {qrDataUrl && (
              <div style={{ display: 'inline-block', padding: 12, borderRadius: 16, border: '2px solid #e2e8f0', background: '#fff', marginBottom: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Voting QR Code" width={240} height={240} style={{ display: 'block' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/vote`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2500)
                  }
                }}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: copied ? '#16a34a' : '#0f172a',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Link Copied to Clipboard!' : '📋 Copy Voting Link'}
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: 13,
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
