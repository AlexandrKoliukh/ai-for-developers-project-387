// ============================================================
// Typed API client
// All calls go through /api, which Vite proxies to Prism.
// ============================================================

import type {
  Booking,
  BookingCreateRequest,
  BookingList,
  BookingWindow,
  EventType,
  EventTypeCreateRequest,
  EventTypeList,
  EventTypeUpdateRequest,
  TimeSlotList,
} from './types';
import { ApiError } from './types';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({
      code: 'UNKNOWN',
      message: `HTTP ${res.status} ${res.statusText}`,
    }));
    throw new ApiError(res.status, errorBody);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Guest API (public) ----------------------------------------

export const guestApi = {
  listEventTypes: () =>
    request<EventTypeList>('GET', '/event-types'),

  getBookingWindow: () =>
    request<BookingWindow>('GET', '/booking-window'),

  /** date must be YYYY-MM-DD and within the 14-day window */
  getAvailableSlots: (eventTypeId: string, date: string) =>
    request<TimeSlotList>('GET', `/event-types/${encodeURIComponent(eventTypeId)}/slots?date=${date}`),

  createBooking: (data: BookingCreateRequest) =>
    request<Booking>('POST', '/bookings', data),

  getBooking: (id: string) =>
    request<Booking>('GET', `/bookings/${encodeURIComponent(id)}`),
};

// ---- Owner API (no auth in this simplified service) ------------

export const ownerApi = {
  listEventTypes: () =>
    request<EventTypeList>('GET', '/owner/event-types'),

  createEventType: (data: EventTypeCreateRequest) =>
    request<EventType>('POST', '/owner/event-types', data),

  updateEventType: (id: string, data: EventTypeUpdateRequest) =>
    request<EventType>('PUT', `/owner/event-types/${encodeURIComponent(id)}`, data),

  deleteEventType: (id: string) =>
    request<void>('DELETE', `/owner/event-types/${encodeURIComponent(id)}`),

  listBookings: (params?: {
    eventTypeId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.eventTypeId) q.set('eventTypeId', params.eventTypeId);
    if (params?.from)        q.set('from',        params.from);
    if (params?.to)          q.set('to',          params.to);
    if (params?.limit)       q.set('limit',       String(params.limit));
    if (params?.offset)      q.set('offset',      String(params.offset));
    const qs = q.toString();
    return request<BookingList>('GET', `/owner/bookings${qs ? `?${qs}` : ''}`);
  },
};
