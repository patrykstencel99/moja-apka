import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { describeStarterPack } from '@/lib/activity-meta';
import { STARTER_PACKS } from '@/lib/starter-packs';

export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request);
    return NextResponse.json({
      packs: STARTER_PACKS.map((pack) => ({
        ...pack,
        description: describeStarterPack(pack.category)
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
