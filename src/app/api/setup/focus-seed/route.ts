import { CheckInPreference, UserFocus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { decorateActivity } from '@/lib/activity-meta';
import { apiCopy } from '@/lib/copy';
import { QUICK_SIGNALS_BY_FOCUS } from '@/lib/focus-signals';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  focus: z.nativeEnum(UserFocus).optional(),
  checkinPreference: z.nativeEnum(CheckInPreference).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.focusSeed.invalidData, 400);
    }

    const focus = parsed.data.focus ?? user.focus;
    const checkinPreference = parsed.data.checkinPreference ?? user.checkinPreference;
    const templates = QUICK_SIGNALS_BY_FOCUS[focus];

    const updatedUser =
      focus !== user.focus || checkinPreference !== user.checkinPreference
        ? await prisma.user.update({
            where: { id: user.id },
            data: {
              focus,
              checkinPreference
            }
          })
        : user;

    const created = [];

    for (const template of templates) {
      const activity = await prisma.activityDefinition.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: template.name
          }
        },
        create: {
          userId: user.id,
          name: template.name,
          category: template.category,
          type: template.type,
          isStarter: true,
          archivedAt: null
        },
        update: {
          category: template.category,
          type: template.type,
          isStarter: true,
          archivedAt: null
        }
      });

      created.push(decorateActivity(activity));
    }

    return NextResponse.json({
      focus: updatedUser.focus,
      checkinPreference: updatedUser.checkinPreference,
      activities: created
    });
  } catch {
    return jsonError(apiCopy.focusSeed.loadFailed, 500);
  }
}
