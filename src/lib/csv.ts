import Papa from 'papaparse';

// Cells starting with one of these characters are evaluated as formulas by
// spreadsheet applications, so they are prefixed with a single quote.
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function sanitizeCsvValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > 0 && FORMULA_TRIGGERS.has(value[0])) {
    return `'${value}`;
  }

  return value;
}

export function sanitizeCsvRow(row: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCsvValue(value);
  }

  return sanitized;
}

export function toCsv(data: unknown, columns?: string[]): string {
  const rows = Array.isArray(data) ? data.map(sanitizeCsvRow) : data;

  return Papa.unparse(rows, {
    header: true,
    skipEmptyLines: true,
    ...(columns ? { columns } : {}),
  });
}

export function csvResponse(content: string, filename: string) {
  return new Response(content, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename.replace(/[^\w.-]+/g, '_')}"`,
    },
  });
}
