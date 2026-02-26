import { DuelResult } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiUser } from '@/lib/auth';
import { evaluateDuelResult } from '@/lib/fun';
import { jsonError } from '@/lib/http';

const schema = z.object({
  duelId: z.string().min(1),
  result: z.nativeEnum(DuelResult)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Niepoprawne dane oceny duelu.', 400);
    }

    const duel = await evaluateDuelResult({
      user,
      duelId: parsed.data.duelId,
      result: parsed.data.result
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
      return jsonError('Najpierw wybierz wariant duelu.', 409);
    }
    if (error instanceof Error && error.message === 'TOO_EARLY') {
      return jsonError('Ocene duelu ustawiasz od kolejnego dnia.', 409);
    }
    return jsonError('Nie udalo sie zapisac wyniku duelu.', 500);
  }
}

