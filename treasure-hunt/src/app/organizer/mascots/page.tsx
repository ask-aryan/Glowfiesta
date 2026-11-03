'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'

interface MascotItem {
  id: string
  employeeName: string
  title: string
  thoughtBehind: string
  fileName: string
  fileSize: number
  fileType: string
  submittedAt: number
}

export default function OrganizerMascotsPage() {
  const [mascots, setMascots] = useState<MascotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStory, setSelectedStory] = useState<MascotItem | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchMascots()
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/artverse`
      setShareUrl(url)
      QRCode.toDataURL(url, { width: 320, margin: 2 }).then(setQrDataUrl).catch(() => {})
    }
  }, [])

  async function fetchMascots() {
    try {
      setLoading(true)
      const res = await fetch('/api/organizer/mascots')
      const data = await res.json()
      if (data.success && data.mascots) {
        setMascots(data.mascots)
      }
    } catch (err) {
      console.error('Error fetching mascots:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/api/organizer/mascots/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMascots(prev => prev.filter(m => m.id !== id))
      } else {
        alert(data.error || 'Failed to delete mascot')
      }
    } catch {
      alert('Network error while deleting mascot')
    } finally {
      setDeletingId(null)
    }
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = mascots.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    m.thoughtBehind.toLowerCase().includes(search.toLowerCase())
  )

  const totalBytes = mascots.reduce((acc, m) => acc + (m.fileSize || 0), 0)
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1)

  return (
    <div style={{ color: '#0f172a', paddingBottom: 60 }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '3px 10px', borderRadius: 999, marginBottom: 6 }}>
            <span>🎨 ARTVERSE 2026</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-.02em', color: '#0f172a' }}>
            Artverse: 3D Mascot Submissions
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Review and download 3D models (.STL) submitted by employees for the Artverse company mascot contest.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowQrModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: '#0f172a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              border: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
            }}
          >
            <span>📱</span>
            <span>Show QR & Share Link</span>
          </button>

          <Link
            href="/mascot"
            target="_blank"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: '#fff',
              color: '#0f172a',
              fontSize: 13,
              fontWeight: 700,
              border: '1.5px solid #cbd5e1',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>↗</span>
            <span>Open Public Form</span>
          </Link>

          <button
            onClick={fetchMascots}
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              fontSize: 13,
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total Submissions
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {mascots.length}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Latest Entry
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
            {mascots.length > 0 ? mascots[0].title : 'None yet'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {mascots.length > 0 ? `by ${mascots[0].employeeName}` : 'Awaiting entries'}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total 3D Storage
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1', marginTop: 4 }}>
            {totalMb} <span style={{ fontSize: 16, fontWeight: 600 }}>MB</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Search submissions by mascot title, employee name, or keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 520,
            padding: '11px 16px',
            borderRadius: 12,
            border: '1.5px solid #cbd5e1',
            background: '#fff',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Submissions List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          Loading 3D Mascot submissions…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px dashed #cbd5e1',
            borderRadius: 18,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>🤖 📥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            {search ? 'No matching submissions found' : 'No 3D mascot submissions yet'}
          </div>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 440, margin: '0 auto 20px' }}>
            {search
              ? 'Try adjusting your search keywords.'
              : 'Share the submission QR code or URL with company employees to begin collecting 3D designs!'}
          </p>
          {!search && (
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: '#6366f1',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 0,
                cursor: 'pointer',
              }}
            >
              Get Submission QR Code 📱
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {filtered.map(m => {
            const dateStr = new Date(m.submittedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
            const sizeMb = (m.fileSize / (1024 * 1024)).toFixed(2)

            return (
              <div
                key={m.id}
                style={{
                  background: '#fff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 18,
                  padding: '22px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  transition: 'transform .15s ease, box-shadow .15s ease',
                }}
              >
                <div>
                  {/* Top Bar: Title & Date */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1.25 }}>
                      {m.title}
                    </h3>
                    <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </span>
                  </div>

                  {/* Creator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    <span>👤</span>
                    <span style={{ fontWeight: 600 }}>{m.employeeName}</span>
                  </div>

                  {/* Thought Preview */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: '#334155',
                      lineHeight: 1.45,
                      marginBottom: 14,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    “{m.thoughtBehind}”
                  </div>

                  {/* File Tag */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                    <span>📦</span>
                    <span>{m.fileName}</span>
                    <span style={{ color: '#6366f1', fontWeight: 500 }}>({sizeMb} MB)</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <button
                    onClick={() => setSelectedStory(m)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    📖 Read Story
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <a
                      href={`/api/organizer/mascots/${m.id}/download`}
                      download
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                      }}
                    >
                      <span>⬇</span>
                      <span>Download STL</span>
                    </a>

                    <button
                      onClick={() => handleDelete(m.id, m.title)}
                      disabled={deletingId === m.id}
                      title="Delete Mascot"
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        borderRadius: 8,
                        padding: '7px 10px',
                        fontSize: 12,
                        cursor: deletingId === m.id ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Story Popup Modal */}
      {selectedStory && (
        <div
          onClick={() => setSelectedStory(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '28px',
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  MASCOT SUBMISSION DETAILS
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: '#0f172a' }}>
                  {selectedStory.title}
                </h2>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Designed by <b>{selectedStory.employeeName}</b>
                </div>
              </div>
              <button
                onClick={() => setSelectedStory(null)}
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

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                Thought & Symbolism Behind The Mascot:
              </div>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#1e293b',
                  whiteSpace: 'pre-line',
                }}
              >
                {selectedStory.thoughtBehind}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                File: <b>{selectedStory.fileName}</b> ({(selectedStory.fileSize / (1024 * 1024)).toFixed(2)} MB)
              </div>
              <a
                href={`/api/organizer/mascots/${selectedStory.id}/download`}
                download
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⬇</span>
                <span>Download Model</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Modal */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: '32px 28px',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                📱 Artverse Contest QR Code
              </div>
              <button
                onClick={() => setShowQrModal(false)}
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

            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 18px' }}>
              Employees can scan this QR code on their phones or laptops to upload their 3D mascot model.
            </p>

            {qrDataUrl && (
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', display: 'inline-block', marginBottom: 18 }}>
                <img src={qrDataUrl} alt="Mascot Contest QR" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13,
                  color: '#334155',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: copied ? '#22c55e' : '#6366f1',
                  color: '#fff',
                  border: 0,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <a
              href={qrDataUrl}
              download="mascot-contest-qr.png"
              style={{
                display: 'block',
                width: '100%',
                padding: '11px',
                borderRadius: 12,
                background: '#0f172a',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              📥 Download Printable QR Image
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
