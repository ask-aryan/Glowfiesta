import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  teamCount: z.number().int().min(1).max(20),
  stagesPerTeam: z.number().int().min(1).max(20),
  hasCommonFinalQr: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
})

export const createTeamSchema = z.object({
  teamName: z.string().min(1).max(100),
  username: z.string().min(1).max(100),
  password: z.string().min(6).max(200),
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
