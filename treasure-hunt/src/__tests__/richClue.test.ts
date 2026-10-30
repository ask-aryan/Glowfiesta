// Jest test for Rich Clue Media Parsing

// Import or replicate the parsing logic to verify
function parseClueMedia(text: string) {
  if (!text) return { displayText: '', media: [] }

  const media: Array<{ type: string; embedUrl: string; originalUrl: string }> = []
  let workingText = text

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

  return { displayText: workingText, media }
}

describe('Clue Media Parsing', () => {
  it('converts a Google Drive view sharing link to preview embed format', () => {
    const raw = 'https://drive.google.com/file/d/1bURrHR1dQlnER8wls4JnvPVeA6vJcJbe/view?usp=sharing'
    const res = parseClueMedia(raw)

    expect(res.media).toHaveLength(1)
    expect(res.media[0].type).toBe('gdrive')
    expect(res.media[0].embedUrl).toBe('https://drive.google.com/file/d/1bURrHR1dQlnER8wls4JnvPVeA6vJcJbe/preview')
  })

  it('preserves text surrounding the Google Drive link', () => {
    const raw = 'Solve this riddle: https://drive.google.com/file/d/1bURrHR1dQlnER8wls4JnvPVeA6vJcJbe/view?usp=sharing'
    const res = parseClueMedia(raw)

    expect(res.displayText).toBe('Solve this riddle:')
    expect(res.media).toHaveLength(1)
    expect(res.media[0].embedUrl).toBe('https://drive.google.com/file/d/1bURrHR1dQlnER8wls4JnvPVeA6vJcJbe/preview')
  })

  it('converts YouTube links properly', () => {
    const raw = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const res = parseClueMedia(raw)

    expect(res.media).toHaveLength(1)
    expect(res.media[0].type).toBe('youtube')
    expect(res.media[0].embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
})
