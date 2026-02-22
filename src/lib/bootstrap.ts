import { ActivityType, PrismaClient } from '@prisma/client';

import { STARTER_PACKS } from '@/lib/starter-packs';

export async function ensureBootstrapUser(prisma: PrismaClient) {
  let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        pinHash: 'auth-disabled',
        timezone: 'Europe/Warsaw'
      }
    });
  }

  await prisma.gamificationState.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  for (const pack of STARTER_PACKS) {
    for (const activity of pack.activities) {
      await prisma.activityDefinition.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: activity.name
          }
        },
        create: {
          userId: user.id,
          name: activity.name,
          category: pack.category,
          type: activity.type === 'BOOLEAN' ? ActivityType.BOOLEAN : ActivityType.NUMERIC_0_10,
          isStarter: true,
          archivedAt: null
        },
        update: {
          category: pack.category,
          type: activity.type === 'BOOLEAN' ? ActivityType.BOOLEAN : ActivityType.NUMERIC_0_10,
          archivedAt: null,
          isStarter: true
        }
      });
    }
  }

  return user;
}
