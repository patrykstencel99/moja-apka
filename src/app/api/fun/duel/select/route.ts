import { DuelChoice } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { selectDuelOption } from '@/lib/fun';
import { jsonError } from '@/lib/http';

const schema = z.object({
  duelId: z.string().min(1),
  choice: z.nativeEnum(DuelChoice)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawne dane duelu.', 400);
    }

    const duel = await selectDuelOption({
      user,
      duelId: parsed.data.duelId,
      choice: parsed.data.choice
    });

    return NextResponse.json({ duel });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Brak autoryzacji.', 401);
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return jsonError('Nie znaleziono duelu.', 404);
    }
    if (error instanceof Error && error.message === 'INVALID_STATE') {
      return jsonError('Duel nie jest gotowy do wyboru.', 409);
    }
    return jsonError('Nie udalo sie zapisac wyboru duelu.', 500);
  }
}

