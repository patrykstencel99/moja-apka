import { CheckInPreference, Prisma, UserFocus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { normalizeProfileName } from '@/lib/competition';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  focus: z.nativeEnum(UserFocus).optional(),
  checkinPreference: z.nativeEnum(CheckInPreference).optional(),
  onboardingComplete: z.boolean().optional(),
  themeKey: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N}._-]+$/u).optional(),
  avatarUrl: z.string().trim().url().optional().nullable(),
  avatarSeed: z.string().trim().max(120).optional().nullable()
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);

    return NextResponse.json({
      onboardingComplete: user.onboardingComplete,
      focus: user.focus,
      checkinPreference: user.checkinPreference,
      themeKey: user.themeKey,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarSeed: user.avatarSeed
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

    const displayName = parsed.data.displayName;
    const displayNameNormalized = displayName ? normalizeProfileName(displayName) : undefined;

    if (displayNameNormalized) {
      const existing = await prisma.user.findUnique({
        where: {
          displayNameNormalized
        }
      });

      if (existing && existing.id !== user.id) {
        return jsonError(apiCopy.profile.displayNameTaken, 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        focus: parsed.data.focus,
        checkinPreference: parsed.data.checkinPreference,
        onboardingComplete: parsed.data.onboardingComplete,
        themeKey: parsed.data.themeKey,
        displayName,
        displayNameNormalized,
        avatarUrl: parsed.data.avatarUrl,
        avatarSeed: parsed.data.avatarSeed
      }
    });

    return NextResponse.json({
      onboardingComplete: updated.onboardingComplete,
      focus: updated.focus,
      checkinPreference: updated.checkinPreference,
      themeKey: updated.themeKey,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      avatarSeed: updated.avatarSeed
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(apiCopy.profile.displayNameTaken, 409);
    }

    return jsonError(apiCopy.profile.saveFailed, 500);
  }
}
