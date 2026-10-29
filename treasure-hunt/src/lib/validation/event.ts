import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  gameType: z.enum(['TREASURE_HUNT', 'QUIZ', 'FUNTAKSHARI']).default('TREASURE_HUNT'),
  teamCount: z.number().int().min(1).max(50),
  stagesPerTeam: z.number().int().min(0).max(20).default(5),
  membersPerTeam: z.number().int().min(1).max(50).default(4),
  hasCommonFinalQr: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
})

export const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  teamCount: z.number().int().min(1).max(50).optional(),
  stagesPerTeam: z.number().int().min(0).max(20).optional(),
  membersPerTeam: z.number().int().min(1).max(50).optional(),
  hasCommonFinalQr: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

export const createTeamSchema = z.object({
  teamName: z.string().min(1).max(100),
  leaderName: z.string().max(100).optional(),
  members: z.string().optional(),
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(6).max(200).optional(),
})

export const updateScoreSchema = z.object({
  delta: z.number().int().optional(),
  score: z.number().int().optional(),
})

export const createClueSchema = z.object({
  teamId: z.number().int().optional(),
  stageNumber: z.number().int().min(1).optional(),
  clueText: z.string().optional(),
  isCommonFinal: z.boolean().default(false),
})

export const verifyReleaseSchema = z.object({
  reportedCode: z.string().length(4),
  stageNumber: z.number().int(),
})
