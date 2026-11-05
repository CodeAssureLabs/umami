import { funnelParametersSchema, savedStatsQuerySchema } from '@/lib/analytics-schema';
import { csvResponse, toCsv } from '@/lib/csv';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { badRequest, notFound } from '@/lib/response';
import { getReport } from '@/queries/prisma';
import { type FunnelParameters, getFunnel } from '@/queries/sql/funnels/getFunnel';

const COLUMNS = [
  'step',
  'type',
  'value',
  'visitors',
  'previous',
  'dropped',
  'dropoff',
  'remaining',
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; funnelId: string }> },
) {
  const { query, error } = await parseRequest(request, savedStatsQuerySchema);
  if (error) return error();
  const { websiteId, funnelId } = await params;
  const report = await getReport(funnelId);
  if (!report || report.websiteId !== websiteId || report.type !== 'funnel') return notFound();
  const parsed = funnelParametersSchema.safeParse(report.parameters);
  if (!parsed.success) return badRequest();
  const filters = await getQueryFilters(query, websiteId);
  const parameters = { ...parsed.data, ...filters } as FunnelParameters;
  const results = await getFunnel(websiteId, parameters, filters);

  const rows = results.map(({ filters: _filters, ...step }, index) => ({
    step: index + 1,
    ...step,
  }));

  return csvResponse(toCsv(rows, COLUMNS), `${report.name || 'funnel'}.csv`);
}
