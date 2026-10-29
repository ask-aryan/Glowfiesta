import { prisma } from './db'

export async function writeAudit(params: {
  eventId?: number
  actorUserId: number
  action: string
  entityType: string
  entityId?: number
  reason?: string
}) {
  await prisma.auditLog.create({ data: params })
}
