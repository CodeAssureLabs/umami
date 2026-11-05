import { expect, test } from 'vitest';
import { csvResponse, sanitizeCsvValue, toCsv } from './csv';

test('prefixes formula triggers with a quote', () => {
  expect(sanitizeCsvValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  expect(sanitizeCsvValue('@cmd')).toBe("'@cmd");
  expect(sanitizeCsvValue('/pricing')).toBe('/pricing');
  expect(sanitizeCsvValue(42)).toBe(42);
});

test('serializes rows with an explicit column order', () => {
  const csv = toCsv(
    [
      { value: '/a', step: 1, visitors: 10 },
      { value: '+b', step: 2, visitors: 4 },
    ],
    ['step', 'value', 'visitors'],
  );

  expect(csv.split(/\r?\n/)).toEqual(['step,value,visitors', '1,/a,10', "2,'+b,4"]);
});

test('returns a downloadable csv response', async () => {
  const response = csvResponse('a,b\r\n1,2', 'Checkout funnel.csv');

  expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
  expect(response.headers.get('content-disposition')).toBe(
    'attachment; filename="Checkout_funnel.csv"',
  );
  expect(await response.text()).toBe('a,b\r\n1,2');
});
