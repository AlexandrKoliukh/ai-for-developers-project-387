import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';
import {
  dateInWindow,
  dateOutOfWindow,
  firstWorkingSlotUTC,
  nowPlusMinutesISO,
  randomSlug,
} from '../fixtures/helpers';
import { makeBookingPayload, makeEventTypePayload } from '../fixtures/data-factories';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Create a fresh event type and return its id for use in booking tests. */
async function setupEventType(api: ReturnType<typeof makeApiClient>) {
  const payload = makeEventTypePayload();
  const { body } = await api.ownerCreateEventType(payload as Record<string, unknown>);
  return (body as { id: string }).id;
}

test.describe('POST /bookings', () => {
  test('creates booking and returns 201 with full Booking schema', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const date = dateInWindow(1);
    const startTime = firstWorkingSlotUTC(date);
    const payload = makeBookingPayload(eventTypeId, startTime, {
      guestNote: 'A note',
    });

    const { status, body } = await api.createBooking(
      payload as Record<string, unknown>,
    );
    const booking = body as {
      id: string;
      eventTypeId: string;
      startTime: string;
      endTime: string;
      guestName: string;
      guestEmail: string;
      guestNote: string;
      createdAt: string;
    };

    expect(status).toBe(201);
    expect(booking.id).toMatch(UUID_RE);
    expect(booking.eventTypeId).toBe(eventTypeId);
    expect(booking.guestName).toBe('Test User');
    expect(booking.guestEmail).toBe('test@example.com');
    expect(booking.guestNote).toBe('A note');
    expect(typeof booking.startTime).toBe('string');
    expect(typeof booking.endTime).toBe('string');
    expect(typeof booking.createdAt).toBe('string');
  });

  test('endTime = startTime + durationMinutes (30)', async ({ request }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const date = dateInWindow(2);
    const startTime = firstWorkingSlotUTC(date);
    const { body } = await api.createBooking(
      makeBookingPayload(eventTypeId, startTime) as Record<string, unknown>,
    );
    const booking = body as { startTime: string; endTime: string };

    const diff =
      new Date(booking.endTime).getTime() -
      new Date(booking.startTime).getTime();
    expect(diff).toBe(30 * 60 * 1000);
  });

  test('409 CONFLICT when same slot booked twice', async ({ request }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const date = dateInWindow(3);
    const startTime = firstWorkingSlotUTC(date);
    const payload = makeBookingPayload(
      eventTypeId,
      startTime,
    ) as Record<string, unknown>;

    const first = await api.createBooking(payload);
    expect(first.status).toBe(201);

    const second = await api.createBooking(payload);
    const err = second.body as { code: string };
    expect(second.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  test('404 NOT_FOUND for unknown eventTypeId', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.createBooking({
      eventTypeId: 'no-such-type',
      startTime: firstWorkingSlotUTC(dateInWindow(1)),
      guestName: 'Test User',
      guestEmail: 'test@example.com',
    });
    const err = body as { code: string };

    expect(status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  test('400 OUT_OF_WINDOW for startTime outside booking window', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const { status, body } = await api.createBooking({
      eventTypeId,
      startTime: firstWorkingSlotUTC(dateOutOfWindow()),
      guestName: 'Test User',
      guestEmail: 'test@example.com',
    });
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('OUT_OF_WINDOW');
  });

  test('400 TOO_SOON when booking < 1 hour from now', async ({ request }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const { status, body } = await api.createBooking({
      eventTypeId,
      startTime: nowPlusMinutesISO(30), // only 30 min from now
      guestName: 'Test User',
      guestEmail: 'test@example.com',
    });
    const err = body as { code: string };

    expect(status).toBe(400);
    expect(err.code).toBe('TOO_SOON');
  });

  test('400 for missing required field (guestName)', async ({ request }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const { status } = await api.createBooking({
      eventTypeId,
      startTime: firstWorkingSlotUTC(dateInWindow(1)),
      guestEmail: 'test@example.com',
      // guestName omitted
    });

    expect(status).toBe(400);
  });
});

test.describe('GET /bookings/{id}', () => {
  test('returns 200 for an existing booking', async ({ request }) => {
    const api = makeApiClient(request);
    const eventTypeId = await setupEventType(api);
    const date = dateInWindow(4);
    const startTime = firstWorkingSlotUTC(date);
    const created = await api.createBooking(
      makeBookingPayload(eventTypeId, startTime) as Record<string, unknown>,
    );
    const bookingId = (created.body as { id: string }).id;

    const { status, body } = await api.getBooking(bookingId);
    const booking = body as { id: string };

    expect(status).toBe(200);
    expect(booking.id).toBe(bookingId);
  });

  test('404 for non-existent UUID', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getBooking(
      '00000000-0000-0000-0000-000000000000',
    );
    const err = body as { code: string };

    expect(status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  test('404 for malformed id (not a UUID)', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.getBooking('not-a-uuid');

    expect(status).toBe(404);
  });
});
