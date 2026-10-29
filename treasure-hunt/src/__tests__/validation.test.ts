import { loginSchema } from '@/lib/validation/auth'
import { createEventSchema, createTeamSchema, createClueSchema } from '@/lib/validation/event'

describe('loginSchema', () => {
  test('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: 'pass123' }).success).toBe(true)
  })
  test('rejects empty username', () => {
    expect(loginSchema.safeParse({ username: '', password: 'pass' }).success).toBe(false)
  })
})

describe('createEventSchema', () => {
  const valid = { name: 'Hunt', teamCount: 5, stagesPerTeam: 5, hasCommonFinalQr: true }
  test('accepts valid event', () => {
    expect(createEventSchema.safeParse(valid).success).toBe(true)
  })
  test('rejects teamCount of 0', () => {
    expect(createEventSchema.safeParse({ ...valid, teamCount: 0 }).success).toBe(false)
  })
  test('rejects stagesPerTeam > 20', () => {
    expect(createEventSchema.safeParse({ ...valid, stagesPerTeam: 21 }).success).toBe(false)
  })
})

describe('createClueSchema', () => {
  test('accepts valid clue', () => {
    expect(createClueSchema.safeParse({ clueText: 'Check the pantry', isCommonFinal: false, stageNumber: 1, teamId: 1 }).success).toBe(true)
  })
  test('rejects stageNumber 0', () => {
    expect(createClueSchema.safeParse({ clueText: 'Check the pantry', stageNumber: 0, isCommonFinal: false }).success).toBe(false)
  })
})

describe('createTeamSchema', () => {
  test('rejects short password', () => {
    expect(createTeamSchema.safeParse({ teamName: 'T1', username: 'u1', password: '123' }).success).toBe(false)
  })
})
