import { PrismaClient, ActivityType } from '@prisma/client';

import { getEnv } from '../src/lib/env';
import { hashPin } from '../src/lib/pin';

const prisma = new PrismaClient();

const starterPacks = [
  {
    category: 'Sen',
    activities: [
      { name: 'Dobra jakosc snu', type: ActivityType.NUMERIC_0_10 },
      { name: 'Pozne zasniecie', type: ActivityType.BOOLEAN }
    ]
  },
  {
    category: 'Odzywianie',
    activities: [
      { name: 'Jadlem pieczywo rano', type: ActivityType.BOOLEAN },
      { name: 'Jadlem ser', type: ActivityType.BOOLEAN },
      { name: 'Jadlem slodycze', type: ActivityType.BOOLEAN }
    ]
  },
  {
    category: 'Ruch',
    activities: [
      { name: 'Trening wykonany', type: ActivityType.BOOLEAN },
      { name: 'Intensywnosc treningu', type: ActivityType.NUMERIC_0_10 }
    ]
  },
  {
    category: 'Uzywki',
    activities: [
      { name: 'Pilem alkohol', type: ActivityType.BOOLEAN },
      { name: 'Pilem kawe wieczorem', type: ActivityType.BOOLEAN }
    ]
  },
  {
    category: 'Produktywnosc',
    activities: [
      { name: 'Gleboka praca', type: ActivityType.BOOLEAN },
      { name: 'Praca po planie', type: ActivityType.BOOLEAN }
    ]
  },
  {
    category: 'Energia',
    activities: [
      { name: 'Spadek energii w poludnie', type: ActivityType.BOOLEAN },
      { name: 'Stabilna energia', type: ActivityType.BOOLEAN }
    ]
  }
];

async function main() {
  const appPin = getEnv('APP_PIN', '1234');
  const pinHash = await hashPin(appPin);

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        pinHash,
        timezone: 'Europe/Warsaw'
      }
    });

    await prisma.gamificationState.create({
      data: {
        userId: user.id
      }
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash }
    });

    await prisma.gamificationState.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {}
    });
  }

  for (const pack of starterPacks) {
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
          type: activity.type,
          isStarter: true
        },
        update: {
          category: pack.category,
          type: activity.type,
          archivedAt: null,
          isStarter: true
        }
      });
    }
  }

  console.log('Seed completed for user:', user.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
