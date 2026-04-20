import { randomSlug } from './helpers';

interface EventTypePayload {
  id?: string;
  title: string;
  description?: string;
  durationMinutes: number;
}

interface BookingPayload {
  eventTypeId: string;
  startTime: string;
  guestName: string;
  guestEmail: string;
  guestNote?: string;
}

/**
 * Returns a valid EventTypeCreateRequest payload.
 * Generates a unique slug on each call to avoid 409 conflicts.
 */
export function makeEventTypePayload(
  overrides: Partial<EventTypePayload> = {},
): EventTypePayload {
  return {
    id: randomSlug(),
    title: 'Test Meeting',
    durationMinutes: 30,
    ...overrides,
  };
}

/**
 * Returns a valid BookingCreateRequest payload.
 */
export function makeBookingPayload(
  eventTypeId: string,
  startTime: string,
  overrides: Partial<BookingPayload> = {},
): BookingPayload {
  return {
    eventTypeId,
    startTime,
    guestName: 'Test User',
    guestEmail: 'test@example.com',
    ...overrides,
  };
}
