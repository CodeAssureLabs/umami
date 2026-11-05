import { z } from 'zod';
import { savedStatsQuerySchema } from '@/lib/analytics-schema';
import { defineOperation } from '@/openapi/operation';
import { badRequestResponse, notFoundResponse, unauthorizedResponse } from '@/openapi/schemas';

export const operations = [
  defineOperation({
    method: 'get',
    path: '/api/websites/{websiteId}/funnels/{funnelId}/export',
    audience: 'public',
    auth: 'bearer-or-share',
    operation: {
      operationId: 'exportWebsiteSavedFunnel',
      summary: 'Export website saved funnel',
      description:
        'Calculates a saved funnel for the requested date range and returns one CSV row per step.',
      tags: ['Websites'],
      requestParams: {
        path: z.object({ websiteId: z.uuid(), funnelId: z.uuid() }),
        query: savedStatsQuerySchema,
      },
      responses: {
        '200': {
          description:
            'CSV file with step, type, value, visitors, previous, dropped, dropoff, and remaining columns.',
          content: {
            'text/csv': {
              schema: {
                type: 'string',
              },
            },
          },
        },
        '400': badRequestResponse,
        '401': unauthorizedResponse,
        '404': notFoundResponse,
      },
    },
  }),
] as const;
