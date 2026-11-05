import { definitionListSchema, goalDefinitionSchema } from '@/lib/analytics-schema';
import { uuid } from '@/lib/crypto';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canUpdateWebsite, canViewWebsiteSection } from '@/permissions';
import { createReport, getWebsiteDefinitions } from '@/queries/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, query, error } = await parseRequest(request, definitionListSchema);
  if (error) return error();
  const { websiteId } = await params;
  if (!(await canViewWebsiteSection(auth, websiteId, 'goals'))) return unauthorized();
  return json(await getWebsiteDefinitions(websiteId, 'goal', query));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, goalDefinitionSchema);
  if (error) return error();
  const { websiteId } = await params;
  if (!(await canUpdateWebsite(auth, websiteId))) return unauthorized();
  return json(
    await createReport({
      id: uuid(),
      userId: auth.user.id,
      websiteId,
      type: 'goal',
      name: body.name,
      description: body.description || '',
      parameters: body.parameters,
    }),
  );
}
