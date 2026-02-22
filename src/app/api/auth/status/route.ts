import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const usersCount = await prisma.user.count({
    where: {
      email: {
        not: null
      }
    }
  });

  return NextResponse.json({
    hasUsers: usersCount > 0
  });
}
