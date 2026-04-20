import "@typespec/http";
import "@typespec/rest";
import "../models.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace CallBooking;

// ---------------------------------------------------------------------------
// Guest (public) API — no auth required
// ---------------------------------------------------------------------------

@route("/")
@tag("Guest")
@doc("Public endpoints for guests to browse event types and create bookings.")
interface GuestApi {

  // ---- Event types (read-only for guests) ----------------------------------

  @get
  @route("/event-types")
  @doc("Browse all publicly available event types offered by the calendar owner.")
  listEventTypes(): {
    @statusCode statusCode: 200;
    @body body: EventTypeList;
  };

  @get
  @route("/event-types/{id}")
  @doc("Get details of a single event type before proceeding to slot selection.")
  getEventType(
    @path
    @doc("The event type slug.")
    id: string,
  ): {
    @statusCode statusCode: 200;
    @body body: EventType;
  } | NotFoundError;

  // ---- Booking window -------------------------------------------------------

  @get
  @route("/booking-window")
  @doc("""
    Return the boundaries of the current booking window: today and today + 13 days (14 days total, UTC).
    The client uses these dates to render the calendar and prevent selection outside the window.
  """)
  getBookingWindow(): {
    @statusCode statusCode: 200;
    @body body: BookingWindow;
  };

  // ---- Time slot availability -----------------------------------------------

  @get
  @route("/event-types/{id}/slots")
  @doc("""
    Return available time slots for a specific event type on a given calendar date.

    Booking window constraint:
    - `date` MUST be within the 14-day booking window: [today, today + 13 days] (UTC).
    - Requests for dates outside this window return 400 ValidationError.

    Server logic:
    1. Divide the owner's working hours into windows of exactly
       eventType.durationMinutes each.
    2. Exclude any window whose [start, end) interval overlaps with ANY
       existing booking on that day — regardless of event type.
    3. Return only the non-overlapping (available=true) windows.

    This satisfies the rule: no two bookings can overlap, even across
    different event types.
  """)
  getAvailableSlots(
    @path
    @doc("The event type slug.")
    id: string,

    @query
    @doc("""
      Calendar date in ISO 8601 format (YYYY-MM-DD), UTC.
      Must be within [today, today + 13 days]. Returns 400 if outside the booking window.
    """)
    date: string,
  ): {
    @statusCode statusCode: 200;
    @body body: TimeSlotList;
  } | NotFoundError | ValidationError;

  // ---- Booking creation ----------------------------------------------------

  @post
  @route("/bookings")
  @doc("""
    Create a booking for a specific event type and time slot.

    Booking window constraint:
    - `startTime` MUST fall within the 14-day booking window: [today 00:00 UTC, today + 13 days 23:59 UTC].
    - Requests with `startTime` outside this window return 400 ValidationError.

    Overlap constraint:
    - The server MUST check for overlapping bookings atomically before inserting.
    - If the chosen startTime overlaps another booking (race condition),
      respond with 409 Conflict — do NOT create the booking.
  """)
  createBooking(
    @body body: BookingCreateRequest,
  ): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | ValidationError | NotFoundError | ConflictError;

  @get
  @route("/bookings/{id}")
  @doc("Retrieve a booking by UUID — used for the confirmation page shown to the guest after booking.")
  getBooking(
    @path
    @doc("The booking UUID.")
    @format("uuid")
    id: string,
  ): {
    @statusCode statusCode: 200;
    @body body: Booking;
  } | NotFoundError;
}
