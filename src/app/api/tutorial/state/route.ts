import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { getTutorialContext, toTutorialStateDto } from '@/lib/tutorial/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    const context = await getTutorialContext(user.id);

    return NextResponse.json(toTutorialStateDto(context));
  } catch {
    return NextResponse.json({ error: apiCopy.common.unauthorized }, { status: 401 });
  }
}
