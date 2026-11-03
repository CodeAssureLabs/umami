import { z } from 'zod';
import Papa from 'papaparse';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { timezoneParam } from '@/lib/schema';
import { getWebsitesExport } from '@/queries/sql';

const MAX_WEBSITES = 20;

const schema = z.object({
  websiteIds: z.array(z.uuid()).min(1).max(MAX_WEBSITES),
  startAt: z.coerce.number().int(),
  endAt: z.coerce.number().int(),
  format: z.enum(['csv', 'json']).optional().default('json'),
  timezone: timezoneParam.optional(),
});

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteIds, startAt, endAt, format, timezone } = body;

  if (startAt > endAt) {
    return badRequest({ message: 'startAt must be before endAt.' });
  }

  const ids = Array.from(new Set(websiteIds));

  const filters = await getQueryFilters({
    startAt: String(startAt),
    endAt: String(endAt),
    timezone,
  });

  const data = await getWebsitesExport(ids, filters);

  if (format === 'csv') {
    const rows = data.map(({ websiteId, stats }) => ({
      websiteId,
      ...(stats[0] ?? {}),
    }));

    const csv = Papa.unparse(rows, { header: true, skipEmptyLines: true });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="websites-export.csv"',
      },
    });
  }

  return json({ data });
}
