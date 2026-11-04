'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import {
  DecorationEventState,
  DecorationTeam,
  DecorationCriteria,
  DecorationStatus,
} from '@/lib/decoration'

export default function OrganizerDecorationPage() {
  const [data, setData] = useState<DecorationEventState | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'FACTORS' | 'LEADERBOARD'>('TEAMS')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Team Modal
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null)
  const [teamNumber, setTeamNumber] = useState(1)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [teamPhoto, setTeamPhoto] = useState<string | null>(null)

  // Factor Modal
  const [showFactorModal, setShowFactorModal] = useState(false)
  const [editingFactorIndex, setEditingFactorIndex] = useState<number | null>(null)
  const [factorName, setFactorName] = useState('')
  const [factorDesc, setFactorDesc] = useState('')
  const [factorMax, setFactorMax] = useState(10)

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Poll state every 2.5 seconds
  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        const res = await fetch(`/api/decoration?_t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && json.data) {
          setData(json.data)
          setLoading(false)
        }
      } catch {}
    }
    loadData()
    const timer = setInterval(loadData, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // Generate QR for audience voting
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/decoration`
    QRCode.toDataURL(url, { width: 300, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [])

  // Status Switcher (Start, Pause, Stop)
  async function handleStatusChange(newStatus: DecorationStatus) {
    setSaving(true)
    try {
      const res = await fetch('/api/decoration/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setMsg(`Voting is now ${newStatus}!`)
        setTimeout(() => setMsg(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Reset Votes
  async function handleResetVotes() {
    if (!confirm('Are you sure you want to reset all audience decoration scores to 0?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/decoration/reset', { method: 'POST' })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setMsg('All decoration scores have been reset to 0!')
        setTimeout(() => setMsg(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Save Setup to DB
  async function saveConfig(teams: DecorationTeam[], criteria: DecorationCriteria[], title?: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/decoration/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || data?.title,
          teams: teams.map((t, idx) => ({
            id: t.id,
            teamNumber: t.teamNumber,
            name: t.name,
            description: t.description,
            photoUrl: t.photoUrl,
            orderIndex: idx,
          })),
          criteria: criteria.map((c, idx) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            maxScore: c.maxScore,
            orderIndex: idx,
          })),
        }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setMsg('Configuration saved successfully!')
        setTimeout(() => setMsg(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Team Modal Actions
  function openCreateTeam() {
    setEditingTeamIndex(null)
    const nextNum = (data?.teams.length || 0) + 1
    setTeamNumber(nextNum)
    setTeamName(`Team ${nextNum}`)
    setTeamDescription(`Desk Bay Counter #${nextNum}`)
    setTeamPhoto(null)
    setShowTeamModal(true)
  }

  function openEditTeam(idx: number) {
    if (!data?.teams[idx]) return
    const t = data.teams[idx]
    setEditingTeamIndex(idx)
    setTeamNumber(t.teamNumber)
    setTeamName(t.name)
    setTeamDescription(t.description || '')
    setTeamPhoto(t.photoUrl || null)
    setShowTeamModal(true)
  }

  function handleSaveTeam() {
    if (!teamName.trim()) {
      alert('Please enter a team / bay name.')
      return
    }

    const currentTeams = [...(data?.teams || [])]
    if (editingTeamIndex !== null && editingTeamIndex >= 0) {
      currentTeams[editingTeamIndex] = {
        ...currentTeams[editingTeamIndex],
        teamNumber: Number(teamNumber) || 1,
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
        photoUrl: teamPhoto || null,
      }
    } else {
      currentTeams.push({
        id: `team_dec_${Date.now()}`,
        teamNumber: Number(teamNumber) || currentTeams.length + 1,
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
        photoUrl: teamPhoto || null,
        orderIndex: currentTeams.length,
        totalScore: 0,
        averageScore: 0,
        ballotsCount: 0,
        criteriaBreakdown: {},
      })
    }

    saveConfig(currentTeams, data?.criteria || [])
    setShowTeamModal(false)
  }

  function handleDeleteTeam(idx: number) {
    if (!confirm('Are you sure you want to remove this team counter?')) return
    const currentTeams = (data?.teams || []).filter((_, i) => i !== idx)
    saveConfig(currentTeams, data?.criteria || [])
  }

  // Factor Modal Actions
  function openCreateFactor() {
    setEditingFactorIndex(null)
    setFactorName('')
    setFactorDesc('')
    setFactorMax(10)
    setShowFactorModal(true)
  }

  function openEditFactor(idx: number) {
    if (!data?.criteria[idx]) return
    const c = data.criteria[idx]
    setEditingFactorIndex(idx)
    setFactorName(c.name)
    setFactorDesc(c.description || '')
    setFactorMax(c.maxScore || 10)
    setShowFactorModal(true)
  }

  function handleSaveFactor() {
    if (!factorName.trim()) {
      alert('Please enter a factor name.')
      return
    }

    const currentCrit = [...(data?.criteria || [])]
    if (editingFactorIndex !== null && editingFactorIndex >= 0) {
      currentCrit[editingFactorIndex] = {
        ...currentCrit[editingFactorIndex],
        name: factorName.trim(),
        description: factorDesc.trim() || undefined,
        maxScore: Number(factorMax) || 10,
      }
    } else {
      currentCrit.push({
        id: `crit_${Date.now()}`,
        name: factorName.trim(),
        description: factorDesc.trim() || undefined,
        maxScore: Number(factorMax) || 10,
        orderIndex: currentCrit.length,
      })
    }

    saveConfig(data?.teams || [], currentCrit)
    setShowFactorModal(false)
  }

  function handleDeleteFactor(idx: number) {
    if ((data?.criteria.length || 0) <= 1) {
      alert('At least one scoring factor is required.')
      return
    }
    if (!confirm('Are you sure you want to remove this factor?')) return
    const currentCrit = (data?.criteria || []).filter((_, i) => i !== idx)
    saveConfig(data?.teams || [], currentCrit)
  }

  // Photo Uploader Helper
  function handlePhotoUpload(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      setTeamPhoto(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const teams = data?.teams || []
  const criteria = data?.criteria || []
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0217 0%, #170826 40%, #280d38 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '28px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>✨</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  Diwali Decoration Event Studio
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background:
                      data?.status === 'ACTIVE'
                        ? 'rgba(34,197,94,0.2)'
                        : data?.status === 'PAUSED'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(239,68,68,0.2)',
                    color:
                      data?.status === 'ACTIVE'
                        ? '#86efac'
                        : data?.status === 'PAUSED'
                        ? '#fde68a'
                        : '#fca5a5',
                    border: `1px solid ${
                      data?.status === 'ACTIVE'
                        ? '#22c55e'
                        : data?.status === 'PAUSED'
                        ? '#f59e0b'
                        : '#ef4444'
                    }`,
                  }}
                >
                  {data?.status === 'ACTIVE' && '● VOTING ACTIVE'}
                  {data?.status === 'PAUSED' && '⏸️ VOTING PAUSED'}
                  {data?.status === 'STOPPED' && '🛑 VOTING STOPPED'}
                </span>
              </div>
              <div style={{ color: '#ffd9b8', fontSize: 13, marginTop: 4 }}>
                Set up team counters, configure scoring factors, and manage live audience desk & bay decoration judging.
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📱</span>
              <span>Audience QR Code</span>
            </button>

            <Link
              href="/decoration/live"
              target="_blank"
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
              }}
            >
              📺 Live Leaderboard Screen
            </Link>

            <Link
              href="/decoration"
              target="_blank"
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(168,85,247,0.2)',
                border: '1px solid rgba(168,85,247,0.4)',
                color: '#e9d5ff',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              🗳️ Open Ballot
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

        {/* Live Voting Controls Ribbon */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(255,200,87,0.3)',
            borderRadius: 20,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd9b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Live Audience Voting Controller
            </div>
            <div style={{ fontSize: 14, color: '#e2e8f0', marginTop: 4 }}>
              Audience visits each team counter, grades them on N factors, and casts 1 vote per device.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {data?.status !== 'ACTIVE' ? (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                }}
              >
                ▶️ Start / Resume Voting
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('PAUSED')}
                disabled={saving}
                style={{
                  padding: '10px 20px',
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
                ⏸️ Pause Voting
              </button>
            )}

            {data?.status !== 'STOPPED' && (
              <button
                onClick={() => handleStatusChange('STOPPED')}
                disabled={saving}
                style={{
                  padding: '10px 20px',
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
                🛑 Stop Voting
              </button>
            )}

            <button
              onClick={handleResetVotes}
              disabled={saving}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Reset Scores
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 20,
            background: 'rgba(255,255,255,0.05)',
            padding: 6,
            borderRadius: 14,
            width: 'fit-content',
          }}
        >
          <button
            onClick={() => setActiveTab('TEAMS')}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 0,
              background: activeTab === 'TEAMS' ? 'linear-gradient(135deg, #FFA23A, #FF6B35)' : 'transparent',
              color: '#fff',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🏢 1. Team Counters ({teams.length})
          </button>

          <button
            onClick={() => setActiveTab('FACTORS')}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 0,
              background: activeTab === 'FACTORS' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
              color: '#fff',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📋 2. Scoring Factors ({criteria.length})
          </button>

          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 0,
              background: activeTab === 'LEADERBOARD' ? 'linear-gradient(135deg, #38bdf8, #2563eb)' : 'transparent',
              color: '#fff',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📊 3. Live Scoreboard ({data?.totalBallots || 0} Ballots)
          </button>
        </div>

        {/* TAB 1: TEAMS SETUP */}
        {activeTab === 'TEAMS' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: 0 }}>
                  Decoration Team Counters
                </h2>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Audience members must score every team counter before submitting their ballot.
                </div>
              </div>
              <button
                onClick={openCreateTeam}
                style={{
                  padding: '9px 18px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #FFA23A, #FF6B35)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Add Team Counter</span>
              </button>
            </div>

            {teams.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 18 }}>
                <h3>No teams configured yet.</h3>
                <p style={{ color: '#94a3b8' }}>Click "+ Add Team Counter" to add your first team.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {teams.map((t, idx) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                      borderRadius: 18,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span
                          style={{
                            background: '#FFC857',
                            color: '#000',
                            fontFamily: 'Fredoka, sans-serif',
                            fontWeight: 900,
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                          }}
                        >
                          COUNTER #{t.teamNumber}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEditTeam(idx)}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: 0,
                              color: '#fff',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(idx)}
                            style={{
                              background: 'rgba(239,68,68,0.2)',
                              border: 0,
                              color: '#fca5a5',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {t.photoUrl && (
                        <img
                          src={t.photoUrl}
                          alt={t.name}
                          style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }}
                        />
                      )}

                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                        {t.name}
                      </div>
                      {t.description && (
                        <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 4 }}>
                          {t.description}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
                      <span>Audience Ratings:</span>
                      <span style={{ fontWeight: 700, color: '#FFC857' }}>
                        {t.ballotsCount} voters • {t.totalScore} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCORING FACTORS SETUP */}
        {activeTab === 'FACTORS' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: 0 }}>
                  Scoring Criteria / Factors (N Factors)
                </h2>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Audience will evaluate each team counter against all these factors.
                </div>
              </div>
              <button
                onClick={openCreateFactor}
                style={{
                  padding: '9px 18px',
                  borderRadius: 12,
                  border: 0,
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Add Scoring Factor</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {criteria.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(168,85,247,0.2)',
                        border: '1px solid #a855f7',
                        color: '#d8b4fe',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                        {c.name}
                      </div>
                      {c.description && <div style={{ fontSize: 13, color: '#ffd9b8', marginTop: 2 }}>{c.description}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'rgba(255,200,87,0.15)',
                        border: '1px solid rgba(255,200,87,0.4)',
                        color: '#FFC857',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Max: {c.maxScore} Pts
                    </span>
                    <button
                      onClick={() => openEditFactor(idx)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.1)',
                        border: 0,
                        color: '#fff',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFactor(idx)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(239,68,68,0.2)',
                        border: 0,
                        color: '#fca5a5',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD & RESULTS */}
        {activeTab === 'LEADERBOARD' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: 0 }}>
                  Live Decoration Leaderboard
                </h2>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Real-time aggregated scores and ranking based on {data?.totalBallots || 0} audience ballots.
                </div>
              </div>

              <Link
                href="/decoration/live"
                target="_blank"
                style={{
                  padding: '9px 18px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                📺 Present on Big Screen →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sortedTeams.map((team, rankIdx) => {
                const isWinner = rankIdx === 0 && team.totalScore > 0
                return (
                  <div
                    key={team.id}
                    style={{
                      background: isWinner
                        ? 'linear-gradient(135deg, rgba(255,200,87,0.15) 0%, rgba(255,107,53,0.1) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: isWinner ? '2px solid #FFC857' : '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: 20,
                      padding: 20,
                      boxShadow: isWinner ? '0 8px 30px rgba(255,200,87,0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 900,
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isWinner ? '#FFC857' : rankIdx === 1 ? '#94a3b8' : rankIdx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                            color: isWinner ? '#000' : '#fff',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          {rankIdx === 0 ? '👑' : rankIdx + 1}
                        </span>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                              Counter #{team.teamNumber}
                            </span>
                            <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                              {team.name}
                            </span>
                          </div>
                          {team.description && <div style={{ fontSize: 12, color: '#ffd9b8', marginTop: 2 }}>{team.description}</div>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Average Score</div>
                          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: 800, color: '#86efac' }}>
                            {team.averageScore} pts
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 18 }}>
                          <div style={{ fontSize: 11, color: '#FFC857', textTransform: 'uppercase' }}>Total Points</div>
                          <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 28, fontWeight: 800, color: '#FFC857' }}>
                            {team.totalScore}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Criteria Breakdown Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      {criteria.map(c => {
                        const scoreData = team.criteriaBreakdown[c.id] || { average: 0, total: 0 }
                        return (
                          <div key={c.id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '8px 12px' }}>
                            <div style={{ fontSize: 11, color: '#ffd9b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                                Avg {scoreData.average} / {c.maxScore}
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                ({scoreData.total} pts)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* TEAM CREATE/EDIT MODAL */}
      {showTeamModal && (
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
            if (e.target === e.currentTarget) setShowTeamModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: 'linear-gradient(145deg, #1f0b2e 0%, #10031a 100%)',
              border: '1.5px solid rgba(255,200,87,0.3)',
              borderRadius: 22,
              padding: '26px 22px',
              color: '#fff',
            }}
          >
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: '0 0 16px' }}>
              {editingTeamIndex !== null ? 'Edit Team Counter' : 'Add Team Counter'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  COUNTER / TEAM NUMBER *
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={teamNumber}
                  onChange={e => setTeamNumber(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#FFC857',
                    fontSize: 16,
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  TEAM / BAY NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Team 1 - Cyber Diwali"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  LOCATION / DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter #1 • 2nd Floor East Wing"
                  value={teamDescription}
                  onChange={e => setTeamDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  COUNTER PHOTO / BANNER (OPTIONAL)
                </label>
                {teamPhoto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={teamPhoto} alt="Preview" style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setTeamPhoto(null)}
                      style={{ background: 'rgba(239,68,68,0.2)', border: 0, color: '#fca5a5', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
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
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Upload Counter Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0])
                      }}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeam}
                  style={{ flex: 2, padding: 12, borderRadius: 10, border: 0, background: 'linear-gradient(135deg, #FFA23A, #FF6B35)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FACTOR CREATE/EDIT MODAL */}
      {showFactorModal && (
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
            if (e.target === e.currentTarget) setShowFactorModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'linear-gradient(145deg, #1f0b2e 0%, #10031a 100%)',
              border: '1.5px solid rgba(168,85,247,0.4)',
              borderRadius: 22,
              padding: '26px 22px',
              color: '#fff',
            }}
          >
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, margin: '0 0 16px' }}>
              {editingFactorIndex !== null ? 'Edit Scoring Factor' : 'Add Scoring Factor'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  FACTOR NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Creativity & Theme 🎨"
                  value={factorName}
                  onChange={e => setFactorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  GUIDANCE / DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Originality, storytelling, and craftsmanship"
                  value={factorDesc}
                  onChange={e => setFactorDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffd9b8', marginBottom: 6 }}>
                  MAXIMUM SCORE (POINTS)
                </label>
                <select
                  value={factorMax}
                  onChange={e => setFactorMax(parseInt(e.target.value) || 10)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(10,3,20,0.6)',
                    color: '#FFC857',
                    fontSize: 15,
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={5}>5 Points (1 to 5 Stars)</option>
                  <option value={10}>10 Points (1 to 10 Scale)</option>
                  <option value={20}>20 Points</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowFactorModal(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFactor}
                  style={{ flex: 2, padding: 12, borderRadius: 10, border: 0, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Factor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
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
            if (e.target === e.currentTarget) setShowQrModal(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'linear-gradient(145deg, #1f0b2e 0%, #10031a 100%)',
              border: '2px solid rgba(255,200,87,0.4)',
              borderRadius: 24,
              padding: '28px 22px',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 22, margin: '0 0 6px' }}>
              Audience Voting QR Code
            </h3>
            <p style={{ color: '#ffd9b8', fontSize: 13, margin: '0 0 18px' }}>
              Audience scans this code to visit each counter and submit scores for all teams.
            </p>

            {qrDataUrl && (
              <div style={{ padding: 12, background: '#fff', borderRadius: 16, display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <img src={qrDataUrl} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  padding: '10px 24px',
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
