import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';
import { makeEventTypePayload, makeBookingPayload } from '../fixtures/data-factories';
import { randomSlug, dateInWindow, firstWorkingSlotUTC } from '../fixtures/helpers';

test.describe('POST /owner/event-types', () => {
  test('creates event type with explicit slug → 201', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    const { status, body } = await api.ownerCreateEventType(
      payload as Record<string, unknown>,
    );
    const et = body as { id: string; title: string; durationMinutes: number };

    expect(status).toBe(201);
    expect(et.id).toBe(payload.id);
    expect(et.title).toBe(payload.title);
    expect(et.durationMinutes).toBe(payload.durationMinutes);
  });

  test('auto-generates valid slug when id omitted', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = { title: 'Auto Slug Meeting', durationMinutes: 45 };
    const { status, body } = await api.ownerCreateEventType(payload);
    const et = body as { id: string };

    expect(status).toBe(201);
    expect(typeof et.id).toBe('string');
    expect(et.id.length).toBeGreaterThan(0);
  });

  test('400 for invalid slug format (uppercase)', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerCreateEventType({
      id: 'InvalidSlug',
      title: 'Bad Slug',
      durationMinutes: 30,
    });

    expect(status).toBe(400);
  });

  test('400 for durationMinutes <= 0', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerCreateEventType({
      id: randomSlug(),
      title: 'Zero Duration',
      durationMinutes: 0,
    });

    expect(status).toBe(400);
  });

  test('400 for empty title', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerCreateEventType({
      id: randomSlug(),
      title: '',
      durationMinutes: 30,
    });

    expect(status).toBe(400);
  });
});

test.describe('GET /owner/event-types', () => {
  test('returns 200 with items and total', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.ownerListEventTypes();
    const list = body as { items: unknown[]; total: number };

    expect(status).toBe(200);
    expect(Array.isArray(list.items)).toBe(true);
    expect(typeof list.total).toBe('number');
  });

  test('includes a newly created event type', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    const { body } = await api.ownerListEventTypes();
    const list = body as { items: Array<{ id: string }> };
    const ids = list.items.map((et) => et.id);

    expect(ids).toContain(payload.id);
  });
});

test.describe('GET /owner/event-types/{id}', () => {
  test('returns 200 for existing slug', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    const { status, body } = await api.ownerGetEventType(payload.id!);
    const et = body as { id: string };

    expect(status).toBe(200);
    expect(et.id).toBe(payload.id);
  });

  test('404 for unknown id', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.ownerGetEventType('not-a-real-type');
    const err = body as { code: string };

    expect(status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

test.describe('PUT /owner/event-types/{id}', () => {
  test('updates title and durationMinutes → 200', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    const updateBody = {
      title: 'Updated Title',
      durationMinutes: 60,
      description: 'New description',
    };
    const { status, body } = await api.ownerUpdateEventType(
      payload.id!,
      updateBody,
    );
    const et = body as {
      id: string;
      title: string;
      durationMinutes: number;
      description: string;
    };

    expect(status).toBe(200);
    expect(et.id).toBe(payload.id); // slug is immutable
    expect(et.title).toBe('Updated Title');
    expect(et.durationMinutes).toBe(60);
  });

  test('404 for unknown id', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerUpdateEventType('no-such', {
      title: 'X',
      durationMinutes: 30,
    });

    expect(status).toBe(404);
  });

  test('400 for durationMinutes <= 0', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    const { status } = await api.ownerUpdateEventType(payload.id!, {
      title: 'Bad',
      durationMinutes: 0,
    });

    expect(status).toBe(400);
  });
});

test.describe('DELETE /owner/event-types/{id}', () => {
  test('204 for event type with no bookings', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    const { status } = await api.ownerDeleteEventType(payload.id!);
    expect(status).toBe(204);
  });

  test('404 for unknown id', async ({ request }) => {
    const api = makeApiClient(request);
    const { status } = await api.ownerDeleteEventType('ghost-type');

    expect(status).toBe(404);
  });

  test('409 CONFLICT when future booking exists for event type', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    // Create event type
    const payload = makeEventTypePayload();
    await api.ownerCreateEventType(payload as Record<string, unknown>);

    // Book a slot — use day 6 to avoid conflicts with bookings.spec.ts (days 1-4)
    const date = dateInWindow(6);
    const startTime = firstWorkingSlotUTC(date);
    const bookingPayload = makeBookingPayload(
      payload.id!,
      startTime,
    ) as Record<string, unknown>;
    const { status: bookStatus } = await api.createBooking(bookingPayload);
    expect(bookStatus).toBe(201);

    // Attempt delete — should be 409
    const { status: delStatus, body } = await api.ownerDeleteEventType(
      payload.id!,
    );
    const err = body as { code: string };

    expect(delStatus).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

test.describe('Full CRUD lifecycle', () => {
  test('Create → Read → Update → Delete → 404', async ({ request }) => {
    const api = makeApiClient(request);
    const payload = makeEventTypePayload();

    // Create
    const { status: createStatus } = await api.ownerCreateEventType(
      payload as Record<string, unknown>,
    );
    expect(createStatus).toBe(201);

    // Read
    const { status: readStatus } = await api.ownerGetEventType(payload.id!);
    expect(readStatus).toBe(200);

    // Update
    const { status: updateStatus } = await api.ownerUpdateEventType(
      payload.id!,
      { title: 'Updated', durationMinutes: 45 },
    );
    expect(updateStatus).toBe(200);

    // Delete
    const { status: deleteStatus } = await api.ownerDeleteEventType(payload.id!);
    expect(deleteStatus).toBe(204);

    // Read after delete → 404
    const { status: missingStatus } = await api.ownerGetEventType(payload.id!);
    expect(missingStatus).toBe(404);
  });
});
