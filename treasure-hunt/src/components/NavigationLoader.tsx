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
      setProgress(prev => (prev < 25 ? 25 : prev))
    }

    function complete() {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 250)
    }

    // Intercept clicks on links or logout / nav buttons
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
          const currentUrl = window.location.pathname + window.location.search
          if (href !== currentUrl) {
            start()
            return
          }
        }
      }

      // Check if button or element is a signout / logout trigger
      const signoutBtn = (e.target as HTMLElement)?.closest('button, [role="button"]')
      if (signoutBtn) {
        const title = signoutBtn.getAttribute('title') || ''
        const text = signoutBtn.textContent || ''
        const isSignout =
          title.toLowerCase().includes('sign out') ||
          title.toLowerCase().includes('logout') ||
          text.toLowerCase().includes('sign out') ||
          text.toLowerCase().includes('logout') ||
          signoutBtn.hasAttribute('data-signout') ||
          signoutBtn.hasAttribute('data-nav-trigger')

        if (isSignout) {
          start()
        }
      }
    }

    // Hook window.history.pushState and replaceState to catch all router.push calls
    const origPush = window.history.pushState
    const origReplace = window.history.replaceState

    window.history.pushState = function (...args) {
      start()
      return origPush.apply(this, args)
    }

    window.history.replaceState = function (...args) {
      start()
      return origReplace.apply(this, args)
    }

    // Custom events
    window.addEventListener('nav-start', start)
    window.addEventListener('nav-end', complete)
    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      window.history.pushState = origPush
      window.history.replaceState = origReplace
      window.removeEventListener('nav-start', start)
      window.removeEventListener('nav-end', complete)
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [])

  // Progress animation while loading
  useEffect(() => {
    if (!loading) return

    const t1 = setTimeout(() => setProgress(prev => (prev < 65 ? 65 : prev)), 180)
    const t2 = setTimeout(() => setProgress(prev => (prev < 85 ? 85 : prev)), 500)
    const t3 = setTimeout(() => setProgress(prev => (prev < 92 ? 92 : prev)), 1000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [loading])

  // When pathname or searchParams change, navigation complete!
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const t = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 250)
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
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.25s ease' : 'width 0.2s cubic-bezier(0.1, 0.8, 0.3, 1)',
          opacity: progress === 100 ? 0 : 1,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
