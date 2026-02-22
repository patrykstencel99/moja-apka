import Link from 'next/link';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';

export function ReportsClient() {
  return (
    <div className="stack-lg">
      <Banner tone="info" title="Kompatybilnosc tras">
        Ekran Raporty zostal zastapiony przez Review.
      </Banner>

      <Card tone="elevated" title="Przejdz do Review" subtitle="Nowy przeplyw: zrozum -> ustaw eksperyment.">
        <Link className="review-link" href="/review">
          Otworz /review
        </Link>
      </Card>
    </div>
  );
}
