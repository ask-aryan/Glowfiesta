'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function startNav() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nav-start'))
  }
}

export function endNav() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nav-end'))
  }
}

export default function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function start() {
      setLoading(true)
      setProgress(25)
    }

    function complete() {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }

    // Intercept clicks on links or explicit navigation triggers
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('a')
      if (target) {
        const href = target.getAttribute('href')
        if (
          href &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:') &&
          target.target !== '_blank' &&
          !target.hasAttribute('download') &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          const currentPath = window.location.pathname
          // Only start if navigating to a different page/url
          if (href !== currentPath && href !== window.location.pathname + window.location.search) {
            start()
            return
          }
        }
      }

      // Check if clicked element is an explicit signout / refresh trigger
      const btn = (e.target as HTMLElement)?.closest('button, [role="button"]')
      if (btn) {
        const title = (btn.getAttribute('title') || '').toLowerCase()
        const text = (btn.textContent || '').toLowerCase()

        // Handle refresh buttons: trigger quick progress sweep and auto-complete after 550ms
        if (title.includes('refresh') || text.includes('refresh') || btn.hasAttribute('data-refresh')) {
          start()
          setTimeout(() => {
            complete()
          }, 550)
          return
        }

        const isSignout =
          title.includes('sign out') ||
          title.includes('logout') ||
          btn.hasAttribute('data-signout')

        if (isSignout) {
          start()
        }
      }
    }

    window.addEventListener('nav-start', start)
    window.addEventListener('nav-end', complete)
    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      window.removeEventListener('nav-start', start)
      window.removeEventListener('nav-end', complete)
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [])

  // Progress animation while loading + absolute safety timeout to prevent getting stuck
  useEffect(() => {
    if (!loading) return

    const t1 = setTimeout(() => setProgress(prev => (prev < 65 ? 65 : prev)), 150)
    const t2 = setTimeout(() => setProgress(prev => (prev < 85 ? 85 : prev)), 350)

    // Safety timeout: If navigation takes longer than 1.6s or page route already changed, auto-finish and vanish!
    const safetyTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 1600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(safetyTimer)
    }
  }, [loading])

  // When pathname or searchParams change, route transition is finished!
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const t = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 999999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #FF6B35 0%, #FFC857 70%, #fff 100%)',
          boxShadow: '0 0 14px rgba(255, 107, 53, 0.95), 0 0 6px rgba(255, 200, 87, 0.9)',
          transition: progress === 100 ? 'width 0.12s ease-out, opacity 0.2s ease' : 'width 0.2s cubic-bezier(0.1, 0.8, 0.3, 1)',
          opacity: progress === 100 ? 0 : 1,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
