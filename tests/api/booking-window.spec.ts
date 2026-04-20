import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';
import { todayISO } from '../fixtures/helpers';

test.describe('GET /booking-window', () => {
  test('returns 200 with windowStart and windowEnd', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getBookingWindow();

    expect(status).toBe(200);
    expect(body).toHaveProperty('windowStart');
    expect(body).toHaveProperty('windowEnd');
  });

  test('windowStart equals today in UTC', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.getBookingWindow();

    expect((body as { windowStart: string }).windowStart).toBe(todayISO());
  });

  test('windowEnd is exactly 13 days after windowStart', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.getBookingWindow();
    const { windowStart, windowEnd } = body as {
      windowStart: string;
      windowEnd: string;
    };

    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(13);
  });

  test('dates are in YYYY-MM-DD format', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.getBookingWindow();
    const { windowStart, windowEnd } = body as {
      windowStart: string;
      windowEnd: string;
    };

    expect(windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(windowEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
