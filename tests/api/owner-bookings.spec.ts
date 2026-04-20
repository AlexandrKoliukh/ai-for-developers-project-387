import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';
import { makeEventTypePayload, makeBookingPayload } from '../fixtures/data-factories';
import { dateInWindow } from '../fixtures/helpers';

/**
 * Slot counter — each call to setupBookings gets 2 unique 30-min slots.
 * We start at day 5 (@9:00) to avoid conflicts with bookings.spec.ts (days 1-4).
 * 16 slots per day (9:00–16:30 inclusive at 30-min intervals).
 */
let _slotCounter = 0;
const SLOTS_PER_DAY = 16;

function nextSlotTime(): string {
  const idx = _slotCounter++;
  const dayOffset = 5 + Math.floor(idx / SLOTS_PER_DAY);
  const slotInDay = idx % SLOTS_PER_DAY;
  const hours = 9 + Math.floor(slotInDay / 2);
  const minutes = (slotInDay % 2) === 0 ? '00' : '30';
  const date = dateInWindow(dayOffset);
  return `${date}T${String(hours).padStart(2, '0')}:${minutes}:00.000Z`;
}

/** Helper: create event type + two bookings using globally unique slots. */
async function setupBookings(api: ReturnType<typeof makeApiClient>) {
  const payload = makeEventTypePayload();
  await api.ownerCreateEventType(payload as Record<string, unknown>);

  const startTime1 = nextSlotTime();
  const startTime2 = nextSlotTime();
  const date1 = startTime1.slice(0, 10);
  const date2 = startTime2.slice(0, 10);

  await api.createBooking(
    makeBookingPayload(
      payload.id!,
      startTime1,
      { guestName: 'Alice', guestEmail: 'alice@example.com' },
    ) as Record<string, unknown>,
  );
  await api.createBooking(
    makeBookingPayload(
      payload.id!,
      startTime2,
      { guestName: 'Bob', guestEmail: 'bob@example.com' },
    ) as Record<string, unknown>,
  );

  return { eventTypeId: payload.id!, date1, date2 };
}

test.describe('GET /owner/bookings', () => {
  test('returns 200 with items array and total', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.ownerListBookings();
    const list = body as { items: unknown[]; total: number };

    expect(status).toBe(200);
    expect(Array.isArray(list.items)).toBe(true);
    expect(typeof list.total).toBe('number');
  });

  test('total reflects count', async ({ request }) => {
    const api = makeApiClient(request);
    await setupBookings(api);
    const { body } = await api.ownerListBookings({ limit: 200 });
    const list = body as { items: unknown[]; total: number };

    expect(list.total).toBeGreaterThanOrEqual(2);
  });

  test('results sorted by startTime ascending', async ({ request }) => {
    const api = makeApiClient(request);
    await setupBookings(api);
    const { body } = await api.ownerListBookings({ limit: 200 });
    const list = body as { items: Array<{ startTime: string }> };

    const times = list.items.map((b) => new Date(b.startTime).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  test('eventTypeId filter returns only bookings for that type', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const { eventTypeId } = await setupBookings(api);
    const { body } = await api.ownerListBookings({ eventTypeId, limit: 200 });
    const list = body as { items: Array<{ eventTypeId: string }> };

    expect(list.items.length).toBeGreaterThanOrEqual(2);
    for (const b of list.items) {
      expect(b.eventTypeId).toBe(eventTypeId);
    }
  });

  test('limit=1 returns exactly 1 item', async ({ request }) => {
    const api = makeApiClient(request);
    await setupBookings(api);
    const { body } = await api.ownerListBookings({ limit: 1 });
    const list = body as { items: unknown[] };

    expect(list.items.length).toBe(1);
  });

  test('offset skips first item', async ({ request }) => {
    const api = makeApiClient(request);
    await setupBookings(api);

    const all = await api.ownerListBookings({ limit: 200 });
    const allItems = (all.body as { items: Array<{ id: string }> }).items;

    const offset1 = await api.ownerListBookings({ limit: 200, offset: 1 });
    const offset1Items = (
      offset1.body as { items: Array<{ id: string }> }
    ).items;

    if (allItems.length >= 2) {
      expect(offset1Items[0].id).toBe(allItems[1].id);
    }
  });

  test('from filter excludes bookings before that date', async ({ request }) => {
    const api = makeApiClient(request);
    const { date2 } = await setupBookings(api);
    const { body } = await api.ownerListBookings({ from: date2, limit: 200 });
    const list = body as { items: Array<{ startTime: string }> };

    for (const b of list.items) {
      const bDate = b.startTime.slice(0, 10);
      expect(bDate >= date2).toBe(true);
    }
  });

  test('to filter excludes bookings after that date', async ({ request }) => {
    const api = makeApiClient(request);
    const { date1 } = await setupBookings(api);
    const { body } = await api.ownerListBookings({ to: date1, limit: 200 });
    const list = body as { items: Array<{ startTime: string }> };

    for (const b of list.items) {
      const bDate = b.startTime.slice(0, 10);
      expect(bDate <= date1).toBe(true);
    }
  });

  test('400 for invalid from date', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerListBookings({ from: 'not-a-date' });

    expect(status).toBe(400);
  });

  test('400 for invalid to date', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerListBookings({ to: '99-99-99' });

    expect(status).toBe(400);
  });
});
