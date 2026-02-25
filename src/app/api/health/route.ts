import { NextResponse } from 'next/server';

import { resolveAuthStatus } from '@/lib/runtime-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await resolveAuthStatus();

  return NextResponse.json(
    {
      ok: status.mode !== 'setup',
      auth: status
    },
    {
      status: status.mode === 'setup' ? 503 : 200
    }
  );
}
