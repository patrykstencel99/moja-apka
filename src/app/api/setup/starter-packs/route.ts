import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { describeStarterSystem } from '@/lib/activity-meta';
import { STARTER_SYSTEMS } from '@/lib/starter-packs';

export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request);
    return NextResponse.json({
      systems: STARTER_SYSTEMS.map((system) => ({
        ...system,
        description: describeStarterSystem(system.name)
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
