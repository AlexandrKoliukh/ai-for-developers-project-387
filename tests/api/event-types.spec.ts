import { test, expect } from '@playwright/test';
import { makeApiClient } from '../fixtures/api-client';

test.describe('GET /event-types', () => {
  test('returns 200 with items array and total', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.listEventTypes();

    expect(status).toBe(200);
    const list = body as { items: unknown[]; total: number };
    expect(Array.isArray(list.items)).toBe(true);
    expect(typeof list.total).toBe('number');
  });

  test('seeded event types are present', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.listEventTypes();
    const list = body as { items: Array<{ id: string }> };
    const ids = list.items.map((et) => et.id);

    expect(ids).toContain('30-min-intro');
    expect(ids).toContain('60-min-deep-dive');
  });

  test('each item has required fields', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.listEventTypes();
    const list = body as {
      items: Array<{ id: string; title: string; durationMinutes: number }>;
    };

    for (const et of list.items) {
      expect(typeof et.id).toBe('string');
      expect(typeof et.title).toBe('string');
      expect(typeof et.durationMinutes).toBe('number');
    }
  });

  test('total matches items.length', async ({ request }) => {
    const api = makeApiClient(request);
    const { body } = await api.listEventTypes();
    const list = body as { items: unknown[]; total: number };

    expect(list.total).toBe(list.items.length);
  });
});

test.describe('GET /event-types/{id}', () => {
  test('returns 200 for 30-min-intro', async ({ request }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getEventType('30-min-intro');
    const et = body as { id: string; durationMinutes: number };

    expect(status).toBe(200);
    expect(et.id).toBe('30-min-intro');
    expect(et.durationMinutes).toBe(30);
  });

  test('returns 200 for 60-min-deep-dive with correct durationMinutes', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getEventType('60-min-deep-dive');
    const et = body as { id: string; durationMinutes: number };

    expect(status).toBe(200);
    expect(et.durationMinutes).toBe(60);
  });

  test('returns 404 with code=NOT_FOUND for unknown slug', async ({
    request,
  }) => {
    const api = makeApiClient(request);
    const { status, body } = await api.getEventType('does-not-exist');
    const err = body as { code: string; message: string };

    expect(status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(typeof err.message).toBe('string');
  });
});
