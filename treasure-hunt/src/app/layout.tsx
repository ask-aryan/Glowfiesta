import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GlowFiesta Treasure Hunt',
  description: 'Office Diwali Treasure Hunt Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
