import { PushDispatchStatus } from '@prisma/client';

import {
  buildReminderCopy,
  createReminderDispatch,
  listDueReminderDispatches,
  listReminderCandidates,
  markDispatchDelivered,
  markDispatchFailed,
  markReminderSent,
  markSubscriptionFailure,
  markSubscriptionSuccess
} from '../src/lib/engagement';
import { isEngagementLoopV1Enabled } from '../src/lib/engagement-flags';
import { prisma } from '../src/lib/prisma';
import { getPushTransportReadiness, normalizePushPayload, sendPushNotification } from '../src/lib/push-transport';

function hasArg(name: string) {
  return process.argv.includes(name);
}


async function enqueueDispatches(now: Date, limit: number) {
  const candidates = await listReminderCandidates(now, limit);

  for (const candidate of candidates) {
    const state = await prisma.engagementDailyState.findUnique({
      where: {
        userId_localDate: {
          userId: candidate.userId,
          localDate: candidate.localDate
        }
      },
      select: {
        nextMicroStep: true
      }
    });

    const copy = buildReminderCopy({
      reminderType: candidate.reminderType,
      missingSlot: candidate.missingSlot,
      microStep: state?.nextMicroStep ?? null,
      rankDeltaToday: 0
    });

    await createReminderDispatch({
      userId: candidate.userId,
      subscriptionId: candidate.subscription.id,
      localDate: candidate.localDate,
      reminderType: candidate.reminderType,
      payload: {
        title: copy.title,
        body: copy.body,
        url: '/today'
      }
    });
  }

  return candidates.length;
}

async function processDueDispatches(params: { now: Date; limit: number; dryRun: boolean }) {
  const due = await listDueReminderDispatches(params.now, params.limit);
  if (due.length === 0) {
    console.log('[engagement-reminders] no due dispatches');
    return;
  }

  for (const dispatch of due) {
    if (dispatch.status === PushDispatchStatus.DELIVERED || dispatch.status === PushDispatchStatus.FAILED) {
      continue;
    }

    if (dispatch.subscription.revokedAt) {
      await markDispatchFailed({
        dispatchId: dispatch.id,
        attemptedAt: params.now,
        attemptCount: dispatch.attemptCount,
        error: 'subscription revoked',
        temporary: false
      });
      continue;
    }

    const payload = normalizePushPayload(dispatch.payload);

    if (params.dryRun) {
      console.log(
        `[dry-run] dispatch=${dispatch.id} user=${dispatch.userId} type=${dispatch.reminderType} attempt=${dispatch.attemptCount} title=${payload.title}`
      );
      continue;
    }

    const result = await sendPushNotification({
      endpoint: dispatch.subscription.endpoint,
      p256dh: dispatch.subscription.p256dh,
      auth: dispatch.subscription.auth,
      payload
    });

    if (result.ok) {
      await markDispatchDelivered(dispatch.id, params.now);
      await markReminderSent({
        userId: dispatch.userId,
        localDate: dispatch.localDate,
        sentAt: params.now
      });
      await markSubscriptionSuccess(dispatch.subscription.id, params.now);
      console.log(`[sent] dispatch=${dispatch.id} user=${dispatch.userId} type=${dispatch.reminderType} via=${result.detail}`);
      continue;
    }

    const failState = await markDispatchFailed({
      dispatchId: dispatch.id,
      attemptedAt: params.now,
      attemptCount: dispatch.attemptCount,
      error: result.detail,
      temporary: result.temporary
    });

    if (result.hardFail || !failState.scheduledRetry) {
      await markSubscriptionFailure(dispatch.subscription.id, params.now);
    }

    console.log(
      `[failed] dispatch=${dispatch.id} user=${dispatch.userId} type=${dispatch.reminderType} detail=${result.detail} retry=${failState.scheduledRetry}`
    );
  }
}

async function main() {
  if (!isEngagementLoopV1Enabled()) {
    console.log('[engagement-reminders] engagement loop disabled by feature flag');
    return;
  }

  const dryRun = !hasArg('--send');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;
  const safeLimit = Number.isFinite(limit) ? limit : 200;
  const now = new Date();

  const readiness = getPushTransportReadiness();
  if (!readiness.ready) {
    throw new Error(`[engagement-reminders] push transport misconfigured (${readiness.mode}): ${readiness.reason}`);
  }

  const enqueuedCount = await enqueueDispatches(now, safeLimit);
  console.log(`[engagement-reminders] enqueuedCandidates=${enqueuedCount} dryRun=${dryRun}`);

  await processDueDispatches({
    now,
    limit: safeLimit,
    dryRun
  });
}

main()
  .catch((error) => {
    console.error('[engagement-reminders] fatal', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
