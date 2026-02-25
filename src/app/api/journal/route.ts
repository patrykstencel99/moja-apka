import { NextRequest, NextResponse } from 'next/server';

import { requireApiUser } from '@/lib/auth';
import { apiCopy } from '@/lib/copy';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { journalDateSchema, journalNoteSchema } from '@/lib/validators';

let journalStorageReady = false;

async function ensureJournalStorage() {
  if (journalStorageReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JournalNote" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "localDate" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JournalNote_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "JournalNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "JournalNote_userId_localDate_createdAt_idx"
    ON "JournalNote" ("userId", "localDate", "createdAt");
  `);

  journalStorageReady = true;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    await ensureJournalStorage();

    const date = new URL(request.url).searchParams.get('date');
    const parsedDate = journalDateSchema.safeParse({ date });

    if (!parsedDate.success) {
      return jsonError(apiCopy.journal.invalidDate, 400);
    }

    const notes = await prisma.journalNote.findMany({
      where: {
        userId: user.id,
        localDate: parsedDate.data.date
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.journal.loadFailed, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request);
    await ensureJournalStorage();

    const body = await request.json().catch(() => null);
    const parsed = journalNoteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(apiCopy.journal.invalidPayload, 400);
    }

    const note = await prisma.journalNote.create({
      data: {
        userId: user.id,
        localDate: parsed.data.localDate,
        content: parsed.data.content
      }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError(apiCopy.common.unauthorized, 401);
    }

    return jsonError(apiCopy.journal.saveFailed, 500);
  }
}
