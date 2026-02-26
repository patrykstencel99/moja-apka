import { backfillCompetitionStats } from '../src/lib/competition';

async function main() {
  const result = await backfillCompetitionStats();
  console.log(
    `Competition backfill completed. Users processed: ${result.usersProcessed}. Missing display names patched: ${result.usersPatchedWithDisplayName}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
