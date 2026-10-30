'use client'
import React, { useState } from 'react'

interface RichClueDisplayProps {
  text: string | null | undefined
  fallbackText?: string
}

interface MediaItem {
  type: 'gdrive' | 'youtube' | 'video' | 'image'
  embedUrl: string
  originalUrl: string
}

function parseClueMedia(text: string): { displayText: string; media: MediaItem[]; isExplicitHorizontal: boolean } {
  if (!text) return { displayText: '', media: [], isExplicitHorizontal: false }

  const isExplicitHorizontal = /#(?:horizontal|landscape|16:9|widescreen)/i.test(text)
  const media: MediaItem[] = []
  let workingText = text.replace(/#(?:horizontal|landscape|vertical|16:9|widescreen)/gi, '').trim()

  // 1. Detect Google Drive links (file/d/<id> or open?id=<id>)
  const gdriveRegex = /https?:\/\/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?|open\?id=([a-zA-Z0-9_-]+)[^\s]*)/gi
  let match: RegExpExecArray | null
  while ((match = gdriveRegex.exec(text)) !== null) {
    const fileId = match[1] || match[2]
    if (fileId) {
      media.push({
        type: 'gdrive',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: match[0],
      })
      workingText = workingText.replace(match[0], '').trim()
    }
  }

  // 2. Detect YouTube links
  const ytRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*)/gi
  while ((match = ytRegex.exec(text)) !== null) {
    const videoId = match[1]
    if (videoId) {
      media.push({
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: match[0],
      })
      workingText = workingText.replace(match[0], '').trim()
    }
  }

  // 3. Detect direct video files (.mp4, .webm, .mov)
  const videoRegex = /https?:\/\/[^\s]+\.(?:mp4|webm|mov)(?:\?[^\s]*)?/gi
  while ((match = videoRegex.exec(workingText)) !== null) {
    media.push({
      type: 'video',
      embedUrl: match[0],
      originalUrl: match[0],
    })
    workingText = workingText.replace(match[0], '').trim()
  }

  // 4. Detect direct image files (.png, .jpg, .jpeg, .gif, .webp)
  const imgRegex = /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s]*)?/gi
  while ((match = imgRegex.exec(workingText)) !== null) {
    media.push({
      type: 'image',
      embedUrl: match[0],
      originalUrl: match[0],
    })
    workingText = workingText.replace(match[0], '').trim()
  }

  return { displayText: workingText, media, isExplicitHorizontal }
}

function VideoEmbedCard({ item, defaultVertical, idx }: { item: MediaItem; defaultVertical: boolean; idx: number }) {
  // Default to vertical (portrait) for phone videos unless horizontal is explicitly chosen
  const [aspect, setAspect] = useState<'vertical' | 'horizontal'>(defaultVertical ? 'vertical' : 'horizontal')
  const isVert = aspect === 'vertical'

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Aspect Ratio Toggle Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: isVert ? 260 : 480,
          marginBottom: 6,
          transition: 'max-width 0.25s ease',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#ffd9b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          🎬 Video Clue
        </span>

        {/* 1-Tap Toggle between Vertical and Landscape */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: 'rgba(0, 0, 0, 0.4)',
            padding: 2,
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <button
            type="button"
            onClick={() => setAspect('vertical')}
            title="Vertical Phone / Reel (9:16)"
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: isVert ? '#FFC857' : 'transparent',
              color: isVert ? '#260c3c' : '#ffd9b8',
              transition: 'all .15s ease',
            }}
          >
            📱 Vertical
          </button>
          <button
            type="button"
            onClick={() => setAspect('horizontal')}
            title="Landscape / Widescreen (16:9)"
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: !isVert ? '#FFC857' : 'transparent',
              color: !isVert ? '#260c3c' : '#ffd9b8',
              transition: 'all .15s ease',
            }}
          >
            🖥️ 16:9
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isVert ? 260 : 480,
          aspectRatio: isVert ? '9/16' : '16/9',
          maxHeight: isVert ? 'min(360px, 45vh)' : 'min(240px, 32vh)',
          borderRadius: 14,
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255, 200, 87, 0.45)',
          transition: 'all 0.25s ease',
        }}
      >
        <iframe
          src={item.embedUrl}
          title={`Clue Video ${idx + 1}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Direct Open Link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          maxWidth: isVert ? 260 : 480,
          marginTop: 6,
        }}
      >
        <a
          href={item.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#FFC857',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 9px',
            borderRadius: 7,
            background: 'rgba(255, 200, 87, 0.1)',
            border: '1px solid rgba(255, 200, 87, 0.25)',
          }}
        >
          <span>{item.type === 'gdrive' ? '📁 Open in Google Drive' : '▶ Open in YouTube'}</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  )
}

export default function RichClueDisplay({ text, fallbackText }: RichClueDisplayProps) {
  if (!text) {
    return (
      <span style={{ color: '#8b7fa8', fontStyle: 'italic' }}>
        {fallbackText || 'No clue text — ask the organizer'}
      </span>
    )
  }

  const { displayText, media, isExplicitHorizontal } = parseClueMedia(text)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {/* Any accompanying text riddle / description */}
      {displayText && (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>
          {displayText}
        </div>
      )}

      {/* Embedded Media Players */}
      {media.map((item, idx) => (
        <div key={idx} style={{ width: '100%', marginTop: displayText ? 4 : 0 }}>
          {item.type === 'gdrive' || item.type === 'youtube' ? (
            <VideoEmbedCard
              item={item}
              defaultVertical={!isExplicitHorizontal}
              idx={idx}
            />
          ) : item.type === 'video' ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <video
                controls
                src={item.embedUrl}
                style={{
                  width: '100%',
                  maxWidth: 260,
                  maxHeight: 'min(360px, 45vh)',
                  borderRadius: 14,
                  background: '#000',
                  border: '2px solid rgba(255, 200, 87, 0.45)',
                }}
              />
            </div>
          ) : item.type === 'image' ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <img
                src={item.embedUrl}
                alt="Clue Attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: 280,
                  borderRadius: 12,
                  objectFit: 'contain',
                  border: '1.5px solid rgba(255, 200, 87, 0.3)',
                }}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
