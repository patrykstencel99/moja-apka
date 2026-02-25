import { CheckInPreference, UserFocus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  focus: z.nativeEnum(UserFocus).optional(),
  checkinPreference: z.nativeEnum(CheckInPreference).optional(),
  onboardingComplete: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);

    return NextResponse.json({
      onboardingComplete: user.onboardingComplete,
      focus: user.focus,
      checkinPreference: user.checkinPreference
    });
  } catch {
    return jsonError(apiCopy.common.unauthorized, 401);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.profile.invalidData, 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        focus: parsed.data.focus,
        checkinPreference: parsed.data.checkinPreference,
        onboardingComplete: parsed.data.onboardingComplete
      }
    });

    return NextResponse.json({
      onboardingComplete: updated.onboardingComplete,
      focus: updated.focus,
      checkinPreference: updated.checkinPreference
    });
  } catch {
    return jsonError(apiCopy.profile.saveFailed, 500);
  }
}
