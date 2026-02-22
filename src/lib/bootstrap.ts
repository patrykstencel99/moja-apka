import { PrismaClient } from '@prisma/client';

export async function ensureBootstrapUser(prisma: PrismaClient) {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    return null;
  }

  await prisma.gamificationState.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  return user;
}
