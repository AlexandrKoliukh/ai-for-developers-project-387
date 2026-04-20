"""
Owner API endpoints.

These endpoints are NOT protected by authentication (the spec has none).
In a real deployment you would add an API key or OAuth2 guard here.
"""
from datetime import date as _Date
from typing import Optional
import uuid as _uuid

from fastapi import APIRouter, HTTPException, Query

from ..models import (
    Booking,
    BookingList,
    EventType,
    EventTypeCreateRequest,
    EventTypeList,
    EventTypeUpdateRequest,
)
from .. import store

router = APIRouter(prefix="/owner", tags=["Owner"])


# ---------------------------------------------------------------------------
# Event types
# ---------------------------------------------------------------------------

@router.get("/event-types", response_model=EventTypeList)
async def list_event_types() -> EventTypeList:
    """List all event types managed by the owner."""
    items = await store.get_all_event_types()
    return EventTypeList(items=items, total=len(items))


def _generate_slug() -> str:
    return _uuid.uuid4().hex[:8]


@router.post("/event-types", response_model=EventType, status_code=201)
async def create_event_type(body: EventTypeCreateRequest) -> EventType:
    """Create a new event type. ID is auto-generated if not provided."""
    base = body.id if body.id else _generate_slug()
    slug = base
    counter = 2
    while await store.event_type_exists(slug):
        slug = f"{base}-{counter}"
        counter += 1
    et = EventType(
        id=slug,
        title=body.title,
        description=body.description,
        durationMinutes=body.durationMinutes,
    )
    return await store.create_event_type(et)


@router.get("/event-types/{id}", response_model=EventType)
async def get_event_type(id: str) -> EventType:
    """Fetch a single event type by its slug."""
    et = await store.get_event_type(id)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{id}' not found"},
        )
    return et


@router.put("/event-types/{id}", response_model=EventType)
async def update_event_type(id: str, body: EventTypeUpdateRequest) -> EventType:
    """
    Replace the mutable fields of an existing event type.
    The slug cannot change after creation.
    """
    et = await store.get_event_type(id)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{id}' not found"},
        )
    # exclude_unset=True: fields absent from the request keep their current value;
    # fields sent as null explicitly clear the value.
    updated = et.model_copy(update=body.model_dump(exclude_unset=True))
    return await store.update_event_type(id, updated)


@router.delete("/event-types/{id}", status_code=204)
async def delete_event_type(id: str) -> None:
    """
    Delete an event type.
    Returns 409 Conflict if future bookings exist for this event type.
    """
    et = await store.get_event_type(id)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{id}' not found"},
        )
    if await store.has_future_bookings_for_event_type(id):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "CONFLICT",
                "message": "Cannot delete: future bookings exist for this event type",
            },
        )
    await store.delete_event_type(id)


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

@router.get("/bookings", response_model=BookingList)
async def list_bookings(
    eventTypeId: Optional[str] = Query(default=None, description="Filter by event type slug"),
    from_: Optional[str] = Query(default=None, alias="from", description="ISO 8601 date — bookings on or after"),
    to: Optional[str] = Query(default=None, description="ISO 8601 date — bookings on or before"),
    limit: int = Query(default=50, ge=1, le=200, description="Results per page"),
    offset: int = Query(default=0, ge=0, description="Zero-based page offset"),
) -> BookingList:
    """
    List all upcoming bookings (startTime >= now UTC), sorted by startTime ascending.
    'Upcoming' means startTime >= now (UTC).
    """
    # Validate date params if provided
    for param_name, param_val in [("from", from_), ("to", to)]:
        if param_val is not None:
            try:
                _Date.fromisoformat(param_val)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "INVALID_DATE",
                        "message": f"'{param_name}' must be ISO 8601 YYYY-MM-DD",
                    },
                )

    items, total = await store.list_bookings_filtered(eventTypeId, from_, to, limit, offset)
    return BookingList(items=items, total=total)
