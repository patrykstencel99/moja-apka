import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const postSchema = z.object({
  endpoint: z.string().trim().url().max(2000),
  keys: z.object({
    p256dh: z.string().trim().min(8).max(500),
    auth: z.string().trim().min(8).max(500)
  })
});

const deleteSchema = z.object({
  endpoint: z.string().trim().url().max(2000)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const payload = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError('Niepoprawny payload subskrypcji push.', 400);
    }

    const userAgent = request.headers.get('user-agent');

    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: parsed.data.endpoint
        }
      },
      create: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        revokedAt: null,
        failCount: 0,
        lastUsedAt: null
      },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        revokedAt: null,
        failCount: 0
      },
      select: {
        id: true,
        endpoint: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user.notificationsEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          notificationsEnabled: true
        }
      });
    }

    return NextResponse.json({
      subscription,
      notificationsEnabled: true
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError('Nie udalo sie zapisac subskrypcji push.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const payload = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError('Niepoprawny payload usuniecia subskrypcji push.', 400);
    }

    const updated = await prisma.pushSubscription.updateMany({
      where: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    if (updated.count > 0) {
      const activeCount = await prisma.pushSubscription.count({
        where: {
          userId: user.id,
          revokedAt: null
        }
      });

      if (activeCount === 0 && user.notificationsEnabled) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            notificationsEnabled: false
          }
        });
      }
    }

    return NextResponse.json({
      revoked: updated.count > 0
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError('Nie udalo sie usunac subskrypcji push.', 500);
  }
}
