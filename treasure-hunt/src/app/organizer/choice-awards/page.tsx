'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AwardCategory, ChoiceAwardsState } from '@/lib/choiceAwards'

export default function ChoiceAwardsAdminPage() {
  const [data, setData] = useState<ChoiceAwardsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedCategories, setEditedCategories] = useState<AwardCategory[]>([])

  const fetchAwards = async () => {
    try {
      const res = await fetch('/api/choice-awards')
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        if (!isEditing) {
          setEditedCategories(JSON.parse(JSON.stringify(json.data.categories)))
        }
      }
    } catch {
      // network glitch
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAwards()
    const timer = setInterval(fetchAwards, 1500)
    return () => clearInterval(timer)
  }, [isEditing])

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
            ? '✅ Voting is now LIVE and accepting responses!'
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

  const handleSaveCategories = async () => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/choice-awards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: editedCategories }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setIsEditing(false)
        setStatusMsg('✅ Categories and nominees saved successfully!')
        setTimeout(() => setStatusMsg(''), 4000)
      } else {
        alert(json.message || 'Failed to save categories')
      }
    } catch {
      alert('Error saving categories')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddCategory = () => {
    const newCatId = `cat_${Date.now()}`
    setEditedCategories(prev => [
      ...prev,
      {
        id: newCatId,
        orderIndex: prev.length,
        title: 'New Award Category',
        subtitle: 'Add description or criteria',
        totalVotes: 0,
        nominees: [
          { id: `nom_${Date.now()}_1`, name: 'Nominee 1', role: 'Team / Role', avatar: '⭐', votesCount: 0 },
          { id: `nom_${Date.now()}_2`, name: 'Nominee 2', role: 'Team / Role', avatar: '🚀', votesCount: 0 },
        ],
      },
    ])
  }

  const handleRemoveCategory = (catIdx: number) => {
    if (!confirm('Delete this award category?')) return
    setEditedCategories(prev => prev.filter((_, idx) => idx !== catIdx))
  }

  const handleAddNominee = (catIdx: number) => {
    setEditedCategories(prev => {
      const copy = [...prev]
      const cat = copy[catIdx]
      cat.nominees.push({
        id: `nom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `New Nominee ${cat.nominees.length + 1}`,
        role: 'Team / Department',
        avatar: '⭐',
        votesCount: 0,
      })
      return copy
    })
  }

  const handleRemoveNominee = (catIdx: number, nomIdx: number) => {
    setEditedCategories(prev => {
      const copy = [...prev]
      copy[catIdx].nominees = copy[catIdx].nominees.filter((_, i) => i !== nomIdx)
      return copy
    })
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
          marginBottom: 28,
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
            Audience votes on all categories via single form. On event night, launch the Oscars reveal stage to unveil winners one by one with transparent vote tallies!
          </p>
        </div>

        {/* Live Projector & Voting Link Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
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
            <span>📱 Voting QR & Link</span>
          </button>

          <Link
            href="/choice-awards/live"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFC857 0%, #FFA23A 60%, #FF6B35 100%)',
              color: '#1a052e',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(255,200,87,0.4)',
            }}
          >
            <span>🏆 Launch Oscars Live Stage ↗</span>
          </Link>
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
              {isLive ? 'ACCEPTING VOTES' : 'RESPONSES STOPPED'}
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

        {/* Categories Count Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            Categories Configured
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
              {data?.categories.length || 0}
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  border: 0,
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Setup
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 0,
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategories}
                  disabled={actionLoading}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 0,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories & Nominees Section */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>
              Award Categories & Nominees
            </h2>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {isEditing ? 'Add, edit, or re-arrange categories and nominees below. Click Save when done.' : 'Current live lineup and vote breakdown per nominee.'}
            </div>
          </div>
          {isEditing && (
            <button
              onClick={handleAddCategory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: '#0f172a',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 0,
              }}
            >
              <span>+ Add Category</span>
            </button>
          )}
        </div>

        {/* Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(isEditing ? editedCategories : data?.categories || []).map((cat, cIdx) => (
            <div
              key={cat.id || cIdx}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 22px',
                background: '#fafafa',
              }}
            >
              {/* Category Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Category {cIdx + 1} of {(isEditing ? editedCategories : data?.categories || []).length}
                  </div>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        value={cat.title}
                        onChange={e => {
                          const val = e.target.value
                          setEditedCategories(prev => {
                            const copy = [...prev]
                            copy[cIdx].title = val
                            return copy
                          })
                        }}
                        placeholder="Category Title"
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          width: '100%',
                        }}
                      />
                      <input
                        value={cat.subtitle || ''}
                        onChange={e => {
                          const val = e.target.value
                          setEditedCategories(prev => {
                            const copy = [...prev]
                            copy[cIdx].subtitle = val
                            return copy
                          })
                        }}
                        placeholder="Category Subtitle / Description"
                        style={{
                          fontSize: 13,
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          width: '100%',
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{cat.title}</div>
                      {cat.subtitle && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{cat.subtitle}</div>}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isEditing && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 999 }}>
                      {cat.totalVotes} votes cast
                    </span>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveCategory(cIdx)}
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                  )}
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
                      border: nom.id === cat.winnerNomineeId && !isEditing && cat.totalVotes > 0
                        ? '2px solid #f59e0b'
                        : '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      position: 'relative',
                      boxShadow: nom.id === cat.winnerNomineeId && !isEditing && cat.totalVotes > 0
                        ? '0 4px 14px rgba(245,158,11,0.18)'
                        : 'none',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={nom.avatar || '⭐'}
                            onChange={e => {
                              const val = e.target.value
                              setEditedCategories(prev => {
                                const copy = [...prev]
                                copy[cIdx].nominees[nIdx].avatar = val
                                return copy
                              })
                            }}
                            title="Avatar Emoji"
                            style={{ width: 40, textAlign: 'center', padding: '4px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                          />
                          <input
                            value={nom.name}
                            onChange={e => {
                              const val = e.target.value
                              setEditedCategories(prev => {
                                const copy = [...prev]
                                copy[cIdx].nominees[nIdx].name = val
                                return copy
                              })
                            }}
                            placeholder="Nominee Name"
                            style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600 }}
                          />
                          <button
                            onClick={() => handleRemoveNominee(cIdx, nIdx)}
                            style={{ background: 'none', border: 0, color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                          >
                            ×
                          </button>
                        </div>
                        <input
                          value={nom.role || ''}
                          onChange={e => {
                            const val = e.target.value
                            setEditedCategories(prev => {
                              const copy = [...prev]
                              copy[cIdx].nominees[nIdx].role = val
                              return copy
                            })
                          }}
                          placeholder="Role / Department (optional)"
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 26, width: 38, height: 38, borderRadius: 10, background: '#f8fafc', display: 'grid', placeItems: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                          {nom.avatar || '⭐'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {nom.name}
                            </div>
                            {nom.id === cat.winnerNomineeId && cat.totalVotes > 0 && (
                              <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                LEADING 🏆
                              </span>
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
                      </>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <button
                  onClick={() => handleAddNominee(cIdx)}
                  style={{
                    marginTop: 12,
                    background: 'none',
                    border: '1px dashed #94a3b8',
                    color: '#475569',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Add Nominee to this Category
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
