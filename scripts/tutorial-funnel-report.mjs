import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toDayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function createCounter() {
  return {
    tutorial_started: 0,
    tutorial_step_shown: 0,
    tutorial_step_completed: 0,
    tutorial_skipped: 0,
    tutorial_completed: 0,
    tutorial_restarted: 0
  };
}

const EVENT_TO_METRIC = {
  STARTED: 'tutorial_started',
  STEP_SHOWN: 'tutorial_step_shown',
  STEP_COMPLETED: 'tutorial_step_completed',
  SKIPPED: 'tutorial_skipped',
  COMPLETED: 'tutorial_completed',
  RESTARTED: 'tutorial_restarted'
};

async function main() {
  const daysArg = Number.parseInt(process.argv[2] ?? '14', 10);
  const days = Number.isFinite(daysArg) && daysArg > 0 ? daysArg : 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.tutorialEvent.findMany({
    where: {
      createdAt: {
        gte: since
      }
    },
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      createdAt: true,
      version: true,
      eventType: true
    }
  });

  const aggregate = new Map();

  for (const event of events) {
    const key = `${toDayKey(event.createdAt)}::v${event.version}`;
    const existing = aggregate.get(key) ?? {
      day: toDayKey(event.createdAt),
      version: event.version,
      ...createCounter()
    };

    const metric = EVENT_TO_METRIC[event.eventType];
    if (metric) {
      existing[metric] += 1;
    }

    aggregate.set(key, existing);
  }

  const rows = Array.from(aggregate.values())
    .map((row) => {
      const started = row.tutorial_started;
      const completed = row.tutorial_completed;
      const completionRate = started > 0 ? Number(((completed / started) * 100).toFixed(1)) : 0;

      return {
        day: row.day,
        version: row.version,
        started,
        shown: row.tutorial_step_shown,
        stepCompleted: row.tutorial_step_completed,
        skipped: row.tutorial_skipped,
        completed,
        restarted: row.tutorial_restarted,
        completionRate
      };
    })
    .sort((a, b) => {
      if (a.day === b.day) {
        return b.version - a.version;
      }
      return a.day < b.day ? 1 : -1;
    });

  console.log(`Tutorial funnel report (last ${days} days)`);
  if (rows.length === 0) {
    console.log('No tutorial events in selected window.');
    return;
  }

  console.table(rows);
}

main()
  .catch((error) => {
    console.error('Failed to generate tutorial funnel report.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
