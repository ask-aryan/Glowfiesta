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
  fileId?: string
}

function parseClueMedia(text: string): { displayText: string; media: MediaItem[] } {
  if (!text) return { displayText: '', media: [] }

  const media: MediaItem[] = []
  let workingText = text

  // 1. Detect Google Drive links (file/d/<id> or open?id=<id>)
  const gdriveRegex = /https?:\/\/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?|open\?id=([a-zA-Z0-9_-]+)[^\s]*)/gi
  let match: RegExpExecArray | null
  while ((match = gdriveRegex.exec(text)) !== null) {
    const fileId = match[1] || match[2]
    if (fileId) {
      media.push({
        type: 'gdrive',
        fileId,
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

  return { displayText: workingText, media }
}

function GDriveVideoPlayer({ item }: { item: MediaItem }) {
  // Use native HTML5 video first to avoid Google's clunky iframe overlay controls on mobile
  const [useIframe, setUseIframe] = useState(false)
  const directStreamUrl = item.fileId
    ? `https://drive.google.com/uc?id=${item.fileId}&export=download`
    : item.originalUrl

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {!useIframe ? (
        // Native HTML5 Video Player: Sleek, non-intrusive controls, respects natural aspect ratio
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            borderRadius: 14,
            overflow: 'hidden',
            background: '#000',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255, 200, 87, 0.45)',
          }}
        >
          <video
            src={directStreamUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setUseIframe(true)}
            style={{
              width: '100%',
              maxHeight: 'min(360px, 45vh)',
              display: 'block',
              borderRadius: 12,
              background: '#000',
              objectFit: 'contain',
            }}
          />
        </div>
      ) : (
        // Fallback Iframe Player in clean 16:9 widescreen so controls don't bunch up
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 460,
            aspectRatio: '16/9',
            maxHeight: 'min(280px, 38vh)',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#000',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255, 200, 87, 0.45)',
          }}
        >
          <iframe
            src={item.embedUrl}
            title="Clue Video"
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
      )}

      {/* Helpful control links */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: 420,
          marginTop: 6,
          padding: '0 2px',
        }}
      >
        <button
          type="button"
          onClick={() => setUseIframe(v => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffd9b8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {useIframe ? '↶ Use Native Player' : 'Having trouble? Use Drive player'}
        </button>

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
          <span>📁 Open in Drive App</span>
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

  const { displayText, media } = parseClueMedia(text)

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
          {item.type === 'gdrive' ? (
            <GDriveVideoPlayer item={item} />
          ) : item.type === 'youtube' ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 460,
                  aspectRatio: '16/9',
                  maxHeight: 'min(280px, 38vh)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255, 200, 87, 0.45)',
                }}
              >
                <iframe
                  src={item.embedUrl}
                  title={`YouTube Clue ${idx + 1}`}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: 460, marginTop: 6 }}>
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
                  <span>▶ Open in YouTube</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ) : item.type === 'video' ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <video
                controls
                playsInline
                src={item.embedUrl}
                style={{
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: 'min(360px, 45vh)',
                  borderRadius: 14,
                  background: '#000',
                  objectFit: 'contain',
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
