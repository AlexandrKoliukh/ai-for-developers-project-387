import "@typespec/http";
import "@typespec/rest";
import "../models.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace CallBooking;

// ---------------------------------------------------------------------------
// Owner API — all routes live under /owner
// No authentication modelled (hardcoded single owner per requirements).
// ---------------------------------------------------------------------------

@route("/owner")
@tag("Owner")
@doc("Operations available to the calendar owner.")
interface OwnerApi {

  // ---- Event Type management -----------------------------------------------

  @get
  @route("/event-types")
  @doc("List all event types managed by the owner.")
  listEventTypes(): {
    @statusCode statusCode: 200;
    @body body: EventTypeList;
  };

  @post
  @route("/event-types")
  @doc("Create a new event type. The slug (id) must be globally unique.")
  createEventType(
    @body body: EventTypeCreateRequest,
  ): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | ValidationError | ConflictError;

  @get
  @route("/event-types/{id}")
  @doc("Fetch a single event type by its slug.")
  getEventType(
    @path
    @doc("The event type slug.")
    id: string,
  ): {
    @statusCode statusCode: 200;
    @body body: EventType;
  } | NotFoundError;

  @put
  @route("/event-types/{id}")
  @doc("Replace the mutable fields of an existing event type. The slug cannot change.")
  updateEventType(
    @path id: string,
    @body body: EventTypeUpdateRequest,
  ): {
    @statusCode statusCode: 200;
    @body body: EventType;
  } | ValidationError | NotFoundError;

  @delete
  @route("/event-types/{id}")
  @doc("""
    Delete an event type.
    Returns 409 Conflict if future bookings exist for this event type.
  """)
  deleteEventType(
    @path id: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | ConflictError;

  // ---- Booking visibility --------------------------------------------------

  @get
  @route("/bookings")
  @doc("""
    List all upcoming bookings across every event type, ordered by startTime ascending.
    'Upcoming' means startTime >= now (UTC).
  """)
  listBookings(
    @query
    @doc("Filter to a specific event type slug. Omit to see all types.")
    eventTypeId?: string,

    @query
    @doc("ISO 8601 date — only return bookings on or after this date.")
    from?: string,

    @query
    @doc("ISO 8601 date — only return bookings on or before this date.")
    to?: string,

    @query
    @doc("Number of results per page (default 50, max 200).")
    limit?: int32,

    @query
    @doc("Zero-based page offset.")
    offset?: int32,
  ): {
    @statusCode statusCode: 200;
    @body body: BookingList;
  } | ValidationError;
}
