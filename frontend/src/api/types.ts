// ============================================================
// Types derived from the TypeSpec specification (src/spec/)
// Keep in sync with models.tsp when the spec changes.
// ============================================================

export interface EventType {
  /** URL-safe slug, e.g. '30-min-intro'. Immutable after creation. */
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
}

export interface EventTypeCreateRequest {
  id?: string;
  title: string;
  description?: string;
  durationMinutes: number;
}

export interface EventTypeUpdateRequest {
  title: string;
  description?: string;
  durationMinutes: number;
}

export interface Booking {
  /** UUID */
  id: string;
  eventTypeId: string;
  /** ISO 8601 UTC */
  startTime: string;
  /** ISO 8601 UTC — derived as startTime + durationMinutes */
  endTime: string;
  guestName: string;
  guestEmail: string;
  guestNote?: string;
  /** ISO 8601 UTC */
  createdAt: string;
}

export interface BookingCreateRequest {
  eventTypeId: string;
  /** ISO 8601 UTC — must align with an available slot */
  startTime: string;
  guestName: string;
  guestEmail: string;
  guestNote?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface TimeSlotList {
  date: string;
  eventTypeId: string;
  slots: TimeSlot[];
}

export interface EventTypeList {
  items: EventType[];
  total: number;
}

export interface BookingList {
  items: Booking[];
  total: number;
}

export interface BookingWindow {
  /** YYYY-MM-DD (today, UTC) */
  windowStart: string;
  /** YYYY-MM-DD (today + 13 days, UTC) */
  windowEnd: string;
}

export interface ErrorBody {
  code: string;
  message: string;
  details?: Array<{ field: string; issue: string }>;
}

/** Thrown by the API client when the server returns a non-2xx response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}
