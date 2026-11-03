import type { QueryFilters } from '@/lib/types';
import { getWebsiteStats } from './getWebsiteStats';
import { getEventMetrics } from './events/getEventMetrics';
import { getPageviewMetrics } from './pageviews/getPageviewMetrics';
import { getSessionMetrics } from './sessions/getSessionMetrics';

export interface WebsiteExportData {
  websiteId: string;
  stats: Awaited<ReturnType<typeof getWebsiteStats>>;
  events: Awaited<ReturnType<typeof getEventMetrics>>;
  pages: Awaited<ReturnType<typeof getPageviewMetrics>>;
  referrers: Awaited<ReturnType<typeof getPageviewMetrics>>;
  browsers: Awaited<ReturnType<typeof getSessionMetrics>>;
  countries: Awaited<ReturnType<typeof getSessionMetrics>>;
}

export async function getWebsitesExport(
  websiteIds: string[],
  filters: QueryFilters,
): Promise<WebsiteExportData[]> {
  return Promise.all(
    websiteIds.map(async websiteId => {
      const [stats, events, pages, referrers, browsers, countries] = await Promise.all([
        getWebsiteStats(websiteId, filters),
        getEventMetrics(websiteId, { type: 'event' }, filters),
        getPageviewMetrics(websiteId, { type: 'path' }, filters),
        getPageviewMetrics(websiteId, { type: 'referrer' }, filters),
        getSessionMetrics(websiteId, { type: 'browser' }, filters),
        getSessionMetrics(websiteId, { type: 'country' }, filters),
      ]);

      return { websiteId, stats, events, pages, referrers, browsers, countries };
    }),
  );
}
