import crypto from 'crypto'
import QRCode from 'qrcode'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const SIX_CHAR_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateSixCharCode(): string {
  const bytes = crypto.randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += SIX_CHAR_ALPHABET[bytes[i] % SIX_CHAR_ALPHABET.length]
  }
  return code
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 300, margin: 2 })
}

export function buildScanUrl(token: string, explicitBaseUrl?: string): string {
  let base = explicitBaseUrl
  if (!base && typeof window !== 'undefined' && window.location?.origin) {
    base = window.location.origin
  }
  if (!base) {
    base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'https://glowfiesta2026.e-connectsolutions.com'
  }
  const cleanBase = base.replace(/\/+$/, '')
  return `${cleanBase}/scan/${token}`
}
