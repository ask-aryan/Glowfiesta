import { generateToken, hashToken, buildScanUrl, generateSixCharCode } from '@/lib/qr'

describe('QR lib', () => {
  test('generateSixCharCode returns 6-char uppercase alphanumeric string', () => {
    const code = generateSixCharCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/)
  })

  test('generateSixCharCode produces unique codes across calls', () => {
    const set = new Set<string>()
    for (let i = 0; i < 50; i++) {
      set.add(generateSixCharCode())
    }
    expect(set.size).toBe(50)
  })

  test('generateToken returns 64-char hex string', () => {
    const token = generateToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[a-f0-9]+$/)
  })

  test('hashToken returns 64-char sha256 hex', () => {
    const hash = hashToken('abc')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  test('two calls produce different tokens', () => {
    expect(generateToken()).not.toEqual(generateToken())
  })

  test('same input always produces same hash', () => {
    expect(hashToken('hello')).toEqual(hashToken('hello'))
  })

  test('buildScanUrl builds correct URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://office.local'
    const url = buildScanUrl('mytoken')
    expect(url).toBe('https://office.local/scan/mytoken')
  })

  test('buildScanUrl builds correct URL with explicit baseUrl', () => {
    const url = buildScanUrl('mytoken', 'https://glowfiesta2026.e-connectsolutions.com')
    expect(url).toBe('https://glowfiesta2026.e-connectsolutions.com/scan/mytoken')
  })
})
