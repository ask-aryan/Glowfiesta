'use client'
import React, { useState, useRef } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'

export default function MascotSubmissionPage() {
  const [employeeName, setEmployeeName] = useState('')
  const [title, setTitle] = useState('')
  const [thoughtBehind, setThoughtBehind] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCommitteeContact, setShowCommitteeContact] = useState(false)
  const [submittedData, setSubmittedData] = useState<{
    employeeName: string
    title: string
    thoughtBehind: string
    fileName: string
    fileSize: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const committeeContact = {
    team: 'Glowfiesta Event Committee',
    email: 'events@e-connectsolutions.com',
    phone: '+91 98765 43210',
    helpNote: 'Available on office floor & WhatsApp for direct STL file transfers.',
  }

  function handleFileChange(selectedFile: File | null) {
    if (!selectedFile) return
    setErrorMsg('')
    setShowCommitteeContact(false)

    // Check size limit: 35 MB
    const maxSize = 35 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setErrorMsg(`Selected file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the 35 MB web limit.`)
      setShowCommitteeContact(true)
      return
    }

    setFile(selectedFile)
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setShowCommitteeContact(false)

    if (!employeeName.trim()) {
      setErrorMsg('Please enter your full employee name.')
      return
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a title / name for your 3D mascot model.')
      return
    }

    if (!thoughtBehind.trim() || thoughtBehind.trim().length < 5) {
      setErrorMsg('Please share the thought or story behind your mascot design.')
      return
    }

    if (!file) {
      setErrorMsg('Please attach your 3D model file (.stl, .obj, .glb, etc.).')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('employeeName', employeeName.trim())
      formData.append('title', title.trim())
      formData.append('thoughtBehind', thoughtBehind.trim())
      formData.append('file', file)

      const res = await fetch('/api/mascot/submit', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit mascot')
      }

      // Celebrate
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFC857', '#FF6B35', '#FFA23A', '#a855f7', '#38bdf8'],
      })

      setSubmittedData({
        employeeName: employeeName.trim(),
        title: title.trim(),
        thoughtBehind: thoughtBehind.trim(),
        fileName: file.name,
        fileSize: file.size,
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while uploading. Please contact the Event Committee.')
      setShowCommitteeContact(true)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setEmployeeName('')
    setTitle('')
    setThoughtBehind('')
    setFile(null)
    setErrorMsg('')
    setShowCommitteeContact(false)
    setSubmittedData(null)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #2a0b4d 0%, #150328 55%, #080010 100%)',
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
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontSize: 20,
            fontWeight: 800,
            textDecoration: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>🎨</span>
          <span>
            Glow<span style={{ color: '#FFC857' }}>Fiesta</span> Artverse
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/vote"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#d8b4fe',
              background: 'rgba(168,85,247,0.18)',
              border: '1px solid rgba(168,85,247,0.4)',
              padding: '6px 14px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            🗳️ Choice Awards
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#ffd9b8',
              textDecoration: 'none',
            }}
          >
            Login →
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '36px 20px 60px',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {submittedData ? (
          /* Success Screen */
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              border: '1.5px solid rgba(255,200,87,0.4)',
              borderRadius: 24,
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.45s ease',
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFC857, #FF6B35)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 42,
                margin: '0 auto 20px',
                boxShadow: '0 8px 30px rgba(255,200,87,0.45)',
              }}
            >
              🎉
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 14px',
                borderRadius: 999,
                background: 'rgba(34,197,94,0.18)',
                border: '1px solid rgba(34,197,94,0.4)',
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              ✓ SUBMISSION CONFIRMED
            </div>

            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 32,
                fontWeight: 800,
                margin: '0 0 10px',
                background: 'linear-gradient(135deg, #ffffff 40%, #FFC857 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Artverse Mascot Submitted! 🚀
            </h1>

            <p style={{ color: '#d8c7ed', fontSize: 15, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.5 }}>
              Thank you, <b>{submittedData.employeeName}</b>! Your 3D mascot design has been safely stored for the company review panel.
            </p>

            {/* Recap Card */}
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '20px 24px',
                textAlign: 'left',
                marginBottom: 28,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#FFC857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  MASCOT TITLE
                </span>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {submittedData.title}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#FFC857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  ATTACHED 3D MODEL
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 14, marginTop: 4 }}>
                  <span>📦</span>
                  <span>{submittedData.fileName}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    ({(submittedData.fileSize / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#FFC857', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  THOUGHT BEHIND
                </span>
                <div style={{ fontSize: 14, color: '#e2e8f0', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {submittedData.thoughtBehind}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '13px 26px',
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #FFC857, #FFA23A)',
                  color: '#160228',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(255,200,87,0.35)',
                }}
              >
                Submit Another Mascot ➕
              </button>
              <Link
                href="/"
                style={{
                  padding: '13px 24px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div style={{ width: '100%' }}>
            {/* Page Title */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: 'rgba(255,200,87,0.15)',
                  border: '1px solid rgba(255,200,87,0.4)',
                  color: '#FFC857',
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                <span>🎨 ARTVERSE 2026 • 3D MASCOT CHALLENGE</span>
              </div>

              <h1
                style={{
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 'clamp(28px, 5vw, 42px)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  margin: '0 0 10px',
                  background: 'linear-gradient(135deg, #ffffff 30%, #FFC857 70%, #FFA23A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Artverse: 3D Mascot Submission
              </h1>

              <p style={{ color: '#c4b5d4', fontSize: 15, maxWidth: 580, margin: '0 auto', lineHeight: 1.5 }}>
                Welcome to <b>Artverse</b>! Management invites you to design the official company mascot. Upload your 3D model (<b>.stl</b>, <b>.obj</b>, <b>.glb</b>), design artwork (<b>.png</b>, <b>.jpg</b>), or concept presentation (<b>.pdf</b>) and share the story behind your creation.
              </p>
            </div>

            {/* Error & Committee Alert */}
            {errorMsg && (
              <div
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1.5px solid rgba(239,68,68,0.5)',
                  color: '#fca5a5',
                  marginBottom: 24,
                  animation: 'slideUp 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  <span>⚠️</span>
                  <span>Upload Issue Encountered</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: '#fee2e2' }}>
                  {errorMsg}
                </div>

                {showCommitteeContact && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFC857', marginBottom: 4 }}>
                      📞 Contact Event Committee for Direct Submission:
                    </div>
                    <div style={{ fontSize: 13, color: '#f8fafc' }}>
                      • <b>Team:</b> {committeeContact.team}<br />
                      • <b>Email:</b> <a href={`mailto:${committeeContact.email}`} style={{ color: '#38bdf8', textDecoration: 'underline' }}>{committeeContact.email}</a><br />
                      • <b>Helpline:</b> {committeeContact.phone} (Floor Coordinator / WhatsApp)<br />
                      • <i>{committeeContact.helpNote}</i>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Form Card */}
            <form
              onSubmit={handleSubmit}
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1.5px solid rgba(255,200,87,0.3)',
                borderRadius: 24,
                padding: '30px 24px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
              }}
            >
              {/* Field 1: Employee Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e5d9f2', marginBottom: 8 }}>
                  YOUR NAME <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Team Member Name"
                  value={employeeName}
                  onChange={e => setEmployeeName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(12,3,24,0.6)',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Field 2: Mascot Title */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e5d9f2', marginBottom: 8 }}>
                  MASCOT TITLE / NAME <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Glowy - The Cyber Diya Mascot"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(12,3,24,0.6)',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Field 3: Thought Behind the Mascot */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e5d9f2', marginBottom: 8 }}>
                  THOUGHT BEHIND THE MASCOT <span style={{ color: '#FF6B35' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Share your inspiration, what this mascot represents for our company, symbolism, and why this design was chosen..."
                  value={thoughtBehind}
                  onChange={e => setThoughtBehind(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(12,3,24,0.6)',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: 12, color: '#a89bc2', marginTop: 4 }}>
                  💡 Expressive descriptions help judges understand your vision during evaluation!
                </div>
              </div>

              {/* Field 4: Model / Image / PDF File Upload Dropzone */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e5d9f2', marginBottom: 8 }}>
                  UPLOAD MASCOT DESIGN (.STL / IMAGE / PDF) <span style={{ color: '#FF6B35' }}>*</span>
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragActive
                      ? '2px dashed #FFC857'
                      : file
                      ? '2px solid #22c55e'
                      : '2px dashed rgba(255,255,255,0.22)',
                    borderRadius: 16,
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: dragActive
                      ? 'rgba(255,200,87,0.12)'
                      : file
                      ? 'rgba(34,197,94,0.08)'
                      : 'rgba(12,3,24,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj,.glb,.gltf,.3mf,.zip,.png,.jpg,.jpeg,.webp,.pdf"
                    onChange={e => handleFileChange(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />

                  {file ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 38 }}>
                        {file.name.match(/\.(png|jpg|jpeg|webp)$/i)
                          ? '🖼️'
                          : file.name.match(/\.pdf$/i)
                          ? '📄'
                          : '📦'}
                      </div>
                      <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 16 }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                        Size: {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for submission
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setFile(null)
                        }}
                        style={{
                          marginTop: 6,
                          padding: '4px 12px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#f87171',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Remove / Choose different file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📦 🖼️ 📄</div>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                        Click to upload or drag & drop your mascot file
                      </div>
                      <div style={{ fontSize: 13, color: '#a89bc2' }}>
                        Supports <b>3D Models (.STL, .OBJ, .GLB)</b>, <b>Images (.PNG, .JPG)</b>, or <b>Design PDFs</b> (Max 35 MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Committee Help Notice Banner */}
              <div
                style={{
                  background: 'rgba(255,200,87,0.08)',
                  border: '1px solid rgba(255,200,87,0.25)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>💡</span>
                <div style={{ fontSize: 13, color: '#ffd9b8', lineHeight: 1.45 }}>
                  <b>Issue with upload or large model?</b> If your file exceeds 35MB or you encounter network problems, please contact the <b>Event Committee</b> directly ({committeeContact.phone} / {committeeContact.email}) to submit in person!
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 54,
                  borderRadius: 16,
                  border: 0,
                  background: loading
                    ? '#64748b'
                    : 'linear-gradient(135deg, #FFC857 0%, #FFA23A 50%, #FF6B35 100%)',
                  color: '#150324',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 28px rgba(255,200,87,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginTop: 6,
                  transition: 'transform 0.15s ease',
                }}
              >
                {loading ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    <span>Uploading 3D Mascot… Please wait</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT TO ARTVERSE</span>
                    <span>🚀</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
