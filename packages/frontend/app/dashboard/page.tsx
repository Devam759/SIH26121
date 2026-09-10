// Rendered per request: the deck reads its view, overlay and highlighted well
// out of the query string, which static prerendering cannot resolve.
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 min-h-[60vh] flex items-center justify-center text-body text-ink-3">
          Loading eRTMAC-NWIS mission control...
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
