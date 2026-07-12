// Audit logging for TransitOps

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function logAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Never break a request due to audit failure
    logger.error('Audit log failed', {
      action: params.action,
      entity: params.entity,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
