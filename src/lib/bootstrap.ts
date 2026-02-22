import { PrismaClient } from '@prisma/client';

import { getEnv } from '@/lib/env';
import { hashPin } from '@/lib/pin';

export async function ensureBootstrapUser(prisma: PrismaClient) {
  const configuredPin = getEnv('APP_PIN', '1234');

  let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    const pinHash = await hashPin(configuredPin);
    user = await prisma.user.create({
      data: {
        pinHash,
        timezone: 'Europe/Warsaw'
      }
    });
  } else if (!user.pinHash.startsWith('scrypt$')) {
    const pinHash = await hashPin(configuredPin);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { pinHash }
    });
  }

  await prisma.gamificationState.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  return user;
}
