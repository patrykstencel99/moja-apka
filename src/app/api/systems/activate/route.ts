import { ActivityType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { STARTER_SYSTEMS } from '@/lib/starter-packs';

const schema = z.object({
  systemId: z.string().min(1),
  includeOptional: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.systems.invalidData, 400);
    }

    const system = STARTER_SYSTEMS.find((item) => item.id === parsed.data.systemId);

    if (!system) {
      return jsonError(apiCopy.systems.notFound, 404);
    }

    const signals = parsed.data.includeOptional
      ? [...system.coreSignals, ...system.advancedSignals]
      : system.coreSignals;

    await prisma.$transaction(async (tx) => {
      for (const signal of signals) {
        await tx.activityDefinition.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: signal.name
            }
          },
          create: {
            userId: user.id,
            name: signal.name,
            category: system.category,
            type: signal.type === 'BOOLEAN' ? ActivityType.BOOLEAN : ActivityType.NUMERIC_0_10,
            isStarter: true,
            archivedAt: null
          },
          update: {
            category: system.category,
            type: signal.type === 'BOOLEAN' ? ActivityType.BOOLEAN : ActivityType.NUMERIC_0_10,
            isStarter: true,
            archivedAt: null
          }
        });
      }
    });

    return NextResponse.json({ ok: true, activated: signals.length, systemId: system.id });
  } catch {
    return jsonError(apiCopy.systems.activationFailed, 500);
  }
}
