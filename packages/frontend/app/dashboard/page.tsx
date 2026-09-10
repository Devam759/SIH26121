// Rendered per request: the deck reads its view, overlay and highlighted well
// out of the query string, which static prerendering cannot resolve.
export const dynamic = 'force-dynamic';

import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return <DashboardClient />;
}
