import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { getThemesForUser, setThemeForUser } from '@/lib/fun';
import { jsonError } from '@/lib/http';

const patchSchema = z.object({
  themeKey: z.string().min(1)
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const payload = await getThemesForUser(user.id);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    return jsonError('Nie udalo sie pobrac motywow.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawne dane motywu.', 400);
    }

    const payload = await setThemeForUser({
      userId: user.id,
      themeKey: parsed.data.themeKey
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    if (error instanceof Error && error.message === 'UNKNOWN_THEME') {
      return jsonError('Nieznany motyw.', 404);
    }
    if (error instanceof Error && error.message === 'THEME_LOCKED') {
      return jsonError('Motyw jest jeszcze zablokowany.', 403);
    }
    return jsonError('Nie udalo sie ustawic motywu.', 500);
  }
}

