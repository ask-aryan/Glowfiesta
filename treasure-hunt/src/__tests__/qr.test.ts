import { generateToken, hashToken, buildScanUrl } from '@/lib/qr'

describe('QR lib', () => {
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
})
