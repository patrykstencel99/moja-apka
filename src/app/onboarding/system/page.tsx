import { SystemOnboardingClient } from '@/components/onboarding/SystemOnboardingClient';
import { STARTER_SYSTEMS } from '@/lib/starter-packs';

export default function OnboardingSystemPage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <SystemOnboardingClient systems={STARTER_SYSTEMS} />
      </section>
    </main>
  );
}
