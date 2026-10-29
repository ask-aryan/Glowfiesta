import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import NavigationLoader from '@/components/NavigationLoader'

export const metadata: Metadata = {
  title: 'GlowFiesta Treasure Hunt',
  description: 'Office Diwali Treasure Hunt Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
