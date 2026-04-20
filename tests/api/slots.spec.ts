import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';
import { dateInWindow, dateOutOfWindow, todayISO, workStartUTCHour } from '../fixtures/helpers';

const EVENT_ID = '30-min-intro';

test.describe('GET /event-types/{id}/slots', () => {
  test('returns 200 with date, eventTypeId, slots array', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const date = dateInWindow(1);
    const { status, body } = await api.getSlots(EVENT_ID, date);
    const result = body as { date: string; eventTypeId: string; slots: unknown[] };

    expect(status).toBe(200);
    expect(result.date).toBe(date);
    expect(result.eventTypeId).toBe(EVENT_ID);
    expect(Array.isArray(result.slots)).toBe(true);
  });

  test('all slots have startTime, endTime, available fields', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const { body } = await api.getSlots(EVENT_ID, dateInWindow(1));
    const { slots } = body as {
      slots: Array<{ startTime: string; endTime: string; available: boolean }>;
    };

    for (const slot of slots) {
      expect(typeof slot.startTime).toBe('string');
      expect(typeof slot.endTime).toBe('string');
      expect(typeof slot.available).toBe('boolean');
    }
  });

  test('first slot starts at WORK_START_HOUR in owner timezone', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const date = dateInWindow(1);
    const { body } = await api.getSlots(EVENT_ID, date);
    const { slots } = body as { slots: Array<{ startTime: string }> };

    if (slots.length > 0) {
      const firstHour = new Date(slots[0].startTime).getUTCHours();
      expect(firstHour).toBe(workStartUTCHour(date));
    }
  });

  test('400 OUT_OF_WINDOW for date before today', async ({ request }) => {
    const api = makeApiClient(request);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const pastDate = yesterday.toISOString().slice(0, 10);

    const { status, body } = await api.getSlots(EVENT_ID, pastDate);
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('OUT_OF_WINDOW');
  });

  test('400 OUT_OF_WINDOW for date outside 14-day window', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots(EVENT_ID, dateOutOfWindow());
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('OUT_OF_WINDOW');
  });

  test('400 INVALID_DATE for non-date string', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots(EVENT_ID, 'tomorrow');
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('INVALID_DATE');
  });

  test('400 INVALID_DATE for impossible date', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots(EVENT_ID, '2024-13-01');
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('INVALID_DATE');
  });

  test('404 NOT_FOUND for unknown event type', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots('no-such-type', dateInWindow(1));
    const err = body as { code: string };

    expect(status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  test('today is a valid date (edge: within window)', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.getSlots(EVENT_ID, todayISO());

    // Today is always in window; expect 200 (may have 0 slots if after work hours)
    expect(status).toBe(200);
  });

  test('today slots are all ≥ 1 hour from now', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots(EVENT_ID, todayISO());
    const { slots } = body as { slots: Array<{ startTime: string }> };

    expect(status).toBe(200);

    const cutoff = Date.now() + 60 * 60_000; // now + 1 hour in ms
    for (const slot of slots) {
      const slotMs = new Date(slot.startTime).getTime();
      expect(slotMs).toBeGreaterThanOrEqual(cutoff);
    }
  });

  test('no past slots returned for today', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getSlots(EVENT_ID, todayISO());
    const { slots } = body as { slots: Array<{ startTime: string }> };

    expect(status).toBe(200);

    const now = Date.now();
    for (const slot of slots) {
      expect(new Date(slot.startTime).getTime()).toBeGreaterThan(now);
    }
  });
});
