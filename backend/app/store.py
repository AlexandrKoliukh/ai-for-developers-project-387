"""
In-memory data store.

DB integration point: replace the dicts below with async ORM session calls
(e.g. SQLAlchemy 2.x async, or any async DB client). Each function maps
1-to-1 to a query or transaction. The asyncio.Lock → SELECT FOR UPDATE.

NOTE: in-memory state is per-process. Run uvicorn with a single worker
(--workers 1, the default) to ensure data consistency.
"""
import asyncio
from datetime import date as _Date, datetime, timezone
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from .models import Booking, EventType

# ---------------------------------------------------------------------------
# State
# DB integration point: replace with connection pool / ORM session factory
# ---------------------------------------------------------------------------
_event_types: Dict[str, EventType] = {}   # keyed by slug
_bookings: Dict[UUID, Booking] = {}       # keyed by UUID

# Mutex for atomic overlap checks.
# DB integration point: replace with DB transaction + SELECT FOR UPDATE.
_lock = asyncio.Lock()


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

def seed_default_event_types() -> None:
    """Populate two default event types on startup."""
    defaults = [
        EventType(
            id="30-min-intro",
            title="30-минутное знакомство",
            description="Краткое знакомство — расскажите о вашем проекте и получите первичную оценку.",
            durationMinutes=30,
        ),
        EventType(
            id="60-min-deep-dive",
            title="60-минутный разбор",
            description="Детальное обсуждение архитектуры, кода или продуктовых вопросов.",
            durationMinutes=60,
        ),
    ]
    for et in defaults:
        _event_types[et.id] = et


# ---------------------------------------------------------------------------
# EventType CRUD
# DB integration point: replace with async ORM queries
# ---------------------------------------------------------------------------

async def get_all_event_types() -> List[EventType]:
    return list(_event_types.values())


async def get_event_type(slug: str) -> Optional[EventType]:
    return _event_types.get(slug)


async def event_type_exists(slug: str) -> bool:
    return slug in _event_types


async def create_event_type(et: EventType) -> EventType:
    _event_types[et.id] = et
    return et


async def update_event_type(slug: str, et: EventType) -> EventType:
    _event_types[slug] = et
    return et


async def delete_event_type(slug: str) -> None:
    _event_types.pop(slug, None)


# ---------------------------------------------------------------------------
# Booking operations
# DB integration point: replace with async ORM queries
# ---------------------------------------------------------------------------

async def get_booking(booking_id: UUID) -> Optional[Booking]:
    return _bookings.get(booking_id)


async def get_all_bookings() -> List[Booking]:
    return list(_bookings.values())


async def create_booking_atomic(booking: Booking) -> Optional[Booking]:
    """
    Atomically check for overlapping bookings, then insert.

    Returns the created Booking, or None if a time conflict exists.

    Half-open interval overlap: A overlaps B  iff  A.start < B.end AND B.start < A.end

    DB integration point: wrap in a DB transaction with SELECT FOR UPDATE
    (or SERIALIZABLE isolation) to handle concurrent requests across workers.
    """
    async with _lock:
        for existing in _bookings.values():
            if booking.startTime < existing.endTime and existing.startTime < booking.endTime:
                return None  # Conflict — caller raises 409
        _bookings[booking.id] = booking
        return booking


async def list_bookings_filtered(
    event_type_id: Optional[str],
    from_date: Optional[str],
    to_date: Optional[str],
    limit: int,
    offset: int,
) -> Tuple[List[Booking], int]:
    """
    Return upcoming bookings (startTime >= now UTC), sorted by startTime ascending.
    Supports optional filters: eventTypeId, from/to date (YYYY-MM-DD, UTC).
    Returns (page_items, total_count).
    """
    now = datetime.now(timezone.utc)
    results = [b for b in _bookings.values() if b.startTime >= now]

    if event_type_id:
        results = [b for b in results if b.eventTypeId == event_type_id]

    if from_date:
        fd = _Date.fromisoformat(from_date)  # already validated upstream
        results = [b for b in results if b.startTime.astimezone(timezone.utc).date() >= fd]

    if to_date:
        td = _Date.fromisoformat(to_date)    # already validated upstream
        results = [b for b in results if b.startTime.astimezone(timezone.utc).date() <= td]

    results.sort(key=lambda b: b.startTime)
    total = len(results)
    return results[offset: offset + limit], total


async def has_future_bookings_for_event_type(slug: str) -> bool:
    """True if any booking with startTime >= now(UTC) belongs to this event type."""
    now = datetime.now(timezone.utc)
    return any(
        b.eventTypeId == slug and b.startTime >= now
        for b in _bookings.values()
    )
