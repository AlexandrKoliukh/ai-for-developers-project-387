import type { APIRequestContext } from '@playwright/test';

// Re-export types from the frontend so tests stay in sync with the spec.
export type {
  EventType,
  EventTypeCreateRequest,
  EventTypeUpdateRequest,
  Booking,
  BookingCreateRequest,
  TimeSlot,
  TimeSlotList,
  EventTypeList,
  BookingList,
  BookingWindow,
  ErrorBody,
} from '../../frontend/src/api/types';

type AnyBody = Record<string, unknown> | undefined;

interface ApiResponse<T> {
  status: number;
  body: T;
}

async function call<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: AnyBody,
): Promise<ApiResponse<T>> {
  const opts = data !== undefined ? { data } : undefined;
  const res = await (method === 'GET'
    ? request.get(url)
    : method === 'POST'
    ? request.post(url, opts)
    : method === 'PUT'
    ? request.put(url, opts)
    : request.delete(url));

  let body: T;
  try {
    body = await res.json();
  } catch {
    body = null as unknown as T;
  }
  return { status: res.status(), body };
}

/**
 * Returns a typed API client bound to the given APIRequestContext.
 * baseURL defaults to http://localhost:8000 (FastAPI).
 * All methods return { status, body } and never throw on non-2xx responses.
 */
export function makeApiClient(
  request: APIRequestContext,
  baseURL = 'http://localhost:8000',
) {
  return {
    // ----- Guest endpoints -----

    listEventTypes() {
      return call(request, 'GET', `${baseURL}/event-types`);
    },
    getEventType(id: string) {
      return call(request, 'GET', `${baseURL}/event-types/${id}`);
    },
    getBookingWindow() {
      return call(request, 'GET', `${baseURL}/booking-window`);
    },
    getSlots(id: string, date: string) {
      return call(
        request,
        'GET',
        `${baseURL}/event-types/${id}/slots?date=${encodeURIComponent(date)}`,
      );
    },
    createBooking(body: AnyBody) {
      return call(request, 'POST', `${baseURL}/bookings`, body);
    },
    getBooking(id: string) {
      return call(request, 'GET', `${baseURL}/bookings/${id}`);
    },

    // ----- Owner endpoints -----

    ownerListEventTypes() {
      return call(request, 'GET', `${baseURL}/owner/event-types`);
    },
    ownerCreateEventType(body: AnyBody) {
      return call(request, 'POST', `${baseURL}/owner/event-types`, body);
    },
    ownerGetEventType(id: string) {
      return call(request, 'GET', `${baseURL}/owner/event-types/${id}`);
    },
    ownerUpdateEventType(id: string, body: AnyBody) {
      return call(request, 'PUT', `${baseURL}/owner/event-types/${id}`, body);
    },
    ownerDeleteEventType(id: string) {
      return call(request, 'DELETE', `${baseURL}/owner/event-types/${id}`);
    },
    ownerListBookings(params: Record<string, string | number> = {}) {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      const url = qs
        ? `${baseURL}/owner/bookings?${qs}`
        : `${baseURL}/owner/bookings`;
      return call(request, 'GET', url);
    },
  };
}
