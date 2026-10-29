'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Listen for clicks on valid internal navigation links
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Ignore hash links, external links, mailto, tel, target="_blank", downloads
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        target.hasAttribute('download') ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      // Check if it's the exact same pathname + hash
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl) return

      // Start the loader
      setLoading(true)
      setProgress(25)
    }

    // Custom event triggers for programmatic navigation / async actions
    function handleCustomStart() {
      setLoading(true)
      setProgress(25)
    }

    function handleCustomEnd() {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 250)
    }

    document.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('nav-start', handleCustomStart)
    window.addEventListener('nav-end', handleCustomEnd)

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('nav-start', handleCustomStart)
      window.removeEventListener('nav-end', handleCustomEnd)
    }
  }, [])

  // Progress animation while loading
  useEffect(() => {
    if (!loading) return

    const t1 = setTimeout(() => setProgress(prev => (prev < 65 ? 65 : prev)), 200)
    const t2 = setTimeout(() => setProgress(prev => (prev < 85 ? 85 : prev)), 600)
    const t3 = setTimeout(() => setProgress(prev => (prev < 92 ? 92 : prev)), 1200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [loading])

  // When pathname or searchParams change, navigation finished!
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
          boxShadow: '0 0 12px rgba(255, 107, 53, 0.9), 0 0 6px rgba(255, 200, 87, 0.8)',
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.25s ease' : 'width 0.25s cubic-bezier(0.1, 0.8, 0.3, 1)',
          opacity: progress === 100 ? 0 : 1,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
