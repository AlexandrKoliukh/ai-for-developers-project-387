import "@typespec/http";

using TypeSpec.Http;

namespace CallBooking;

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

@doc("An event type represents a kind of meeting the owner offers (e.g. '30-min intro call').")
model EventType {
  @doc("Unique URL-safe slug identifier, e.g. '30-min-intro'.")
  @minLength(2)
  @maxLength(80)
  @pattern("^[a-z0-9]+(?:-[a-z0-9]+)*$")
  id: string;

  @doc("Human-readable title displayed to guests.")
  @minLength(1)
  @maxLength(120)
  title: string;

  @doc("Optional longer description of what will happen during the call.")
  @maxLength(1000)
  description?: string;

  @doc("Fixed call duration in minutes (e.g. 15, 30, 60).")
  durationMinutes: int32;
}

@doc("Payload for creating a new event type.")
model EventTypeCreateRequest {
  @doc("URL-safe slug. If omitted, the server generates one automatically.")
  @minLength(2)
  @maxLength(80)
  @pattern("^[a-z0-9]+(?:-[a-z0-9]+)*$")
  id?: string;

  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(1000)
  description?: string;

  durationMinutes: int32;
}

@doc("Payload for updating an existing event type. The slug cannot be changed after creation.")
model EventTypeUpdateRequest {
  @minLength(1)
  @maxLength(120)
  title: string;

  @maxLength(1000)
  description?: string;

  durationMinutes: int32;
}

@doc("A confirmed booking for a specific event type and time slot.")
model Booking {
  @doc("Unique booking identifier (UUID).")
  @format("uuid")
  id: string;

  @doc("The slug of the event type that was booked.")
  eventTypeId: string;

  @doc("Start time of the booked slot (UTC).")
  startTime: utcDateTime;

  @doc("End time of the booked slot — derived as startTime + eventType.durationMinutes.")
  endTime: utcDateTime;

  @doc("Guest's display name.")
  @minLength(1)
  @maxLength(200)
  guestName: string;

  @doc("Guest's email address for confirmation.")
  @format("email")
  @maxLength(254)
  guestEmail: string;

  @doc("Optional note or context the guest wants to share with the owner.")
  @maxLength(2000)
  guestNote?: string;

  @doc("Timestamp when the booking was created (UTC).")
  createdAt: utcDateTime;
}

@doc("Request body for creating a new booking.")
model BookingCreateRequest {
  @doc("The event type slug to book.")
  eventTypeId: string;

  @doc("Desired start time (UTC). Must align with an available slot.")
  startTime: utcDateTime;

  @doc("Guest's name.")
  @minLength(1)
  @maxLength(200)
  guestName: string;

  @doc("Guest's email.")
  @format("email")
  @maxLength(254)
  guestEmail: string;

  @doc("Optional note from the guest.")
  @maxLength(2000)
  guestNote?: string;
}

@doc("""
  A single time slot for a given date and event type.
  Slots are pre-computed by the server based on working-hours rules
  and existing bookings. No two bookings may overlap — this rule applies
  across all event types.
""")
model TimeSlot {
  @doc("Slot start time (UTC).")
  startTime: utcDateTime;

  @doc("Slot end time (UTC) — equals startTime + eventType.durationMinutes.")
  endTime: utcDateTime;

  @doc("Whether this slot is currently bookable (not overlapping any existing booking).")
  available: boolean;
}

// ---------------------------------------------------------------------------
// List wrappers
// ---------------------------------------------------------------------------

@doc("List of event types.")
model EventTypeList {
  items: EventType[];
  total: int32;
}

@doc("List of bookings with total count.")
model BookingList {
  items: Booking[];
  total: int32;
}

@doc("""
  Available time slots for a specific date and event type.
  All dates are within the 14-day booking window starting from today (UTC).
""")
model TimeSlotList {
  @doc("The date for which slots were computed (ISO 8601, YYYY-MM-DD).")
  date: string;

  eventTypeId: string;

  @doc("Only slots where available=true are shown to the guest.")
  slots: TimeSlot[];
}

@doc("""
  The booking window available to guests.
  Slots exist only within [windowStart, windowEnd] (14 calendar days from today).
""")
model BookingWindow {
  @doc("First bookable date (today, UTC, ISO 8601 YYYY-MM-DD).")
  windowStart: string;

  @doc("Last bookable date (today + 13 days, UTC, ISO 8601 YYYY-MM-DD).")
  windowEnd: string;
}

// ---------------------------------------------------------------------------
// Error models
// ---------------------------------------------------------------------------

@doc("Standard error envelope shared by all error responses.")
model ErrorBody {
  @doc("Machine-readable error code.")
  code: string;

  @doc("Human-readable explanation of what went wrong.")
  message: string;

  @doc("Optional per-field validation details.")
  details?: ValidationDetail[];
}

@doc("Per-field validation failure detail.")
model ValidationDetail {
  @doc("Name of the field that failed validation.")
  field: string;

  @doc("Description of the constraint violated.")
  issue: string;
}

@error
@doc("The request body or query parameters are invalid.")
model ValidationError {
  @statusCode statusCode: 400;
  @body body: ErrorBody;
}

@error
@doc("The requested resource does not exist.")
model NotFoundError {
  @statusCode statusCode: 404;
  @body body: ErrorBody;
}

@error
@doc("""
  The requested time slot is no longer available because it overlaps
  with an existing booking (including bookings of other event types).
  The client should refresh available slots and let the guest choose again.
""")
model ConflictError {
  @statusCode statusCode: 409;
  @body body: ErrorBody;
}
