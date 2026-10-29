'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    // Poll every 3 seconds when tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, 3000)

    // Immediately refresh when user returns to tab / unlocks phone
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [router])

  return null
}
