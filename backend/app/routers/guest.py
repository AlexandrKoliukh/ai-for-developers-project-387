"""
Public (guest) API endpoints.

All endpoints are unauthenticated — any visitor can call them.
Working hours and timezone are configurable via environment variables.
"""
import os
from datetime import date as _Date, datetime, timedelta, timezone
from typing import List
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from ..models import (
    Booking,
    BookingCreateRequest,
    BookingWindow,
    EventType,
    EventTypeList,
    TimeSlot,
    TimeSlotList,
)
from .. import store

# ---------------------------------------------------------------------------
# Owner / working-hours configuration (environment variables)
#
# OWNER_TIMEZONE       — IANA timezone name, e.g. "Europe/Moscow" or "UTC"
# WORK_START_HOUR      — Start hour of working day in owner's local time (default 9)
# WORK_START_MINUTE    — Start minute (default 0)
# WORK_END_HOUR        — End hour of working day in owner's local time (default 18)
# WORK_END_MINUTE      — End minute (default 0), e.g. 30 for 18:30
# SLOT_INTERVAL_MINUTES — Step between slot start times (default 30).
#                         Slots span durationMinutes each but start times
#                         advance by this interval, so a 360-min meeting
#                         with a 30-min interval shows many start options.
#
# Guests see UTC datetimes in API responses; the browser renders them
# in the guest's local timezone automatically via new Date(isoString).
# ---------------------------------------------------------------------------
OWNER_TIMEZONE = os.getenv("OWNER_TIMEZONE", "UTC")
WORK_START_HOUR = int(os.getenv("WORK_START_HOUR", "9"))
WORK_START_MINUTE = int(os.getenv("WORK_START_MINUTE", "0"))
WORK_END_HOUR = int(os.getenv("WORK_END_HOUR", "18"))
WORK_END_MINUTE = int(os.getenv("WORK_END_MINUTE", "0"))
SLOT_INTERVAL_MINUTES = int(os.getenv("SLOT_INTERVAL_MINUTES", "30"))
BOOKING_WINDOW_DAYS = 14
MIN_BOOKING_LEAD_MINUTES = 60

router = APIRouter(tags=["Guest"])


def _owner_tz() -> ZoneInfo:
    return ZoneInfo(OWNER_TIMEZONE)


def _today_owner() -> _Date:
    """Today's date in the owner's timezone."""
    return datetime.now(_owner_tz()).date()


def _booking_window():
    """Return (window_start, window_end) dates in owner's timezone."""
    today = _today_owner()
    return today, today + timedelta(days=BOOKING_WINDOW_DAYS - 1)


def _generate_slots(target_date: _Date, duration_minutes: int) -> List[TimeSlot]:
    """
    Generate potential time slots for target_date.

    Start times advance by SLOT_INTERVAL_MINUTES (default 30 min).
    Each slot spans duration_minutes. Only slots that end on or before
    WORK_END are included.

    Example: 360-min meeting, 9:00-20:30, 30-min interval →
        9:00-15:00, 9:30-15:30, ..., 14:30-20:30  (12 slots)

    All returned startTime / endTime values are UTC (timezone-aware).
    ZoneInfo handles DST transitions automatically.
    """
    tz = _owner_tz()
    slot_duration = timedelta(minutes=duration_minutes)
    interval = timedelta(minutes=SLOT_INTERVAL_MINUTES)

    # Working-hour boundaries in owner's local timezone
    start_local = datetime(
        target_date.year, target_date.month, target_date.day,
        WORK_START_HOUR, WORK_START_MINUTE, 0, tzinfo=tz,
    )
    end_local = datetime(
        target_date.year, target_date.month, target_date.day,
        WORK_END_HOUR, WORK_END_MINUTE, 0, tzinfo=tz,
    )

    slots: List[TimeSlot] = []
    current = start_local
    while current + slot_duration <= end_local:
        slot_end = current + slot_duration
        slots.append(TimeSlot(
            startTime=current.astimezone(timezone.utc),
            endTime=slot_end.astimezone(timezone.utc),
            available=True,  # availability filtered by caller
        ))
        current += interval  # advance by fixed interval, not by duration
    return slots


def _slot_is_available(slot: TimeSlot, bookings: List[Booking]) -> bool:
    """
    Return True if slot [startTime, endTime) does NOT overlap any booking.

    Half-open interval overlap rule:
        A overlaps B  iff  A.start < B.end  AND  B.start < A.end
    """
    for b in bookings:
        if slot.startTime < b.endTime and b.startTime < slot.endTime:
            return False
    return True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/booking-window", response_model=BookingWindow)
async def get_booking_window() -> BookingWindow:
    """Return the 14-day bookable window (dates in owner's timezone)."""
    window_start, window_end = _booking_window()
    return BookingWindow(
        windowStart=window_start.isoformat(),
        windowEnd=window_end.isoformat(),
    )


@router.get("/event-types", response_model=EventTypeList)
async def list_event_types() -> EventTypeList:
    """Browse all event types offered by the owner."""
    items = await store.get_all_event_types()
    return EventTypeList(items=items, total=len(items))


@router.get("/event-types/{id}", response_model=EventType)
async def get_event_type(id: str) -> EventType:
    """Get details of a single event type by slug."""
    et = await store.get_event_type(id)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{id}' not found"},
        )
    return et


@router.get("/event-types/{id}/slots", response_model=TimeSlotList)
async def get_available_slots(
    id: str,
    date: str = Query(..., description="Calendar date YYYY-MM-DD in owner's timezone"),
) -> TimeSlotList:
    """
    Return available time slots for a given date and event type.

    Booking-window constraint: date must be within [today, today+13] in owner's TZ.
    Overlap constraint: slots overlapping any existing booking are excluded.
    """
    # 1. Parse date string
    try:
        target_date = _Date.fromisoformat(date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_DATE", "message": "date must be ISO 8601 YYYY-MM-DD"},
        )

    # 2. Validate within booking window
    window_start, window_end = _booking_window()
    if not (window_start <= target_date <= window_end):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "OUT_OF_WINDOW",
                "message": f"date must be within [{window_start}, {window_end}]",
            },
        )

    # 3. Check event type exists
    et = await store.get_event_type(id)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{id}' not found"},
        )

    # 4. Generate all slots, then filter by existing bookings (across ALL event types)
    all_slots = _generate_slots(target_date, et.durationMinutes)
    all_bookings = await store.get_all_bookings()
    available = [s for s in all_slots if _slot_is_available(s, all_bookings)]

    # 5. Filter out slots too close to current time (min lead time)
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc + timedelta(minutes=MIN_BOOKING_LEAD_MINUTES)
    available = [s for s in available if s.startTime >= cutoff]

    return TimeSlotList(date=date, eventTypeId=id, slots=available)


@router.post("/bookings", response_model=Booking, status_code=201)
async def create_booking(body: BookingCreateRequest) -> Booking:
    """
    Create a booking for an event type at a specific time.

    Validates:
    - startTime is within the 14-day booking window
    - The event type exists
    - No overlap with existing bookings (atomic check, 409 on race condition)
    """
    # Normalise to UTC-aware datetime
    start_utc = body.startTime
    if start_utc.tzinfo is None:
        start_utc = start_utc.replace(tzinfo=timezone.utc)
    else:
        start_utc = start_utc.astimezone(timezone.utc)

    # 1a. Lead time check — must be at least MIN_BOOKING_LEAD_MINUTES from now
    now_utc_check = datetime.now(timezone.utc)
    if start_utc < now_utc_check + timedelta(minutes=MIN_BOOKING_LEAD_MINUTES):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "TOO_SOON",
                "message": f"Booking must be at least {MIN_BOOKING_LEAD_MINUTES} minutes from now",
            },
        )

    # 1b. Booking window check
    booking_date = start_utc.date()
    window_start, window_end = _booking_window()
    if not (window_start <= booking_date <= window_end):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "OUT_OF_WINDOW",
                "message": "startTime is outside the 14-day booking window",
            },
        )

    # 2. Event type must exist
    et = await store.get_event_type(body.eventTypeId)
    if not et:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": f"Event type '{body.eventTypeId}' not found"},
        )

    # 3. Compute end time
    end_utc = start_utc + timedelta(minutes=et.durationMinutes)

    # 4. Atomic overlap check + insert
    booking = Booking(
        id=uuid4(),
        eventTypeId=body.eventTypeId,
        startTime=start_utc,
        endTime=end_utc,
        guestName=body.guestName,
        guestEmail=body.guestEmail,
        guestNote=body.guestNote,
        createdAt=datetime.now(timezone.utc),
    )

    result = await store.create_booking_atomic(booking)
    if result is None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "CONFLICT",
                "message": "This time slot is no longer available. Please choose another slot.",
            },
        )
    return result


@router.get("/bookings/{id}", response_model=Booking)
async def get_booking(id: str) -> Booking:
    """Retrieve a confirmed booking by UUID (for the confirmation page)."""
    try:
        booking_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Booking not found"},
        )
    booking = await store.get_booking(booking_uuid)
    if not booking:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Booking not found"},
        )
    return booking
