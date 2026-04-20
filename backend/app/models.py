"""
Pydantic v2 models — mirrors the OpenAPI spec in
src/spec/tsp-output/@typespec/openapi3/openapi.yaml exactly.
"""
import re
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# Slug pattern from spec: ^[a-z0-9]+(?:-[a-z0-9]+)*$
_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# ---------------------------------------------------------------------------
# Event types
# ---------------------------------------------------------------------------

class EventType(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=2, max_length=80, description="URL-safe slug, e.g. '30-min-intro'")
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    durationMinutes: int = Field(gt=0, description="Call duration in minutes")

    @field_validator("id")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not _SLUG_RE.match(v):
            raise ValueError("id must match ^[a-z0-9]+(?:-[a-z0-9]+)*$")
        return v


class EventTypeCreateRequest(BaseModel):
    id: Optional[str] = Field(default=None, min_length=2, max_length=80)
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    durationMinutes: int = Field(gt=0)

    @field_validator("id")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _SLUG_RE.match(v):
            raise ValueError("id must match ^[a-z0-9]+(?:-[a-z0-9]+)*$")
        return v


class EventTypeUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    durationMinutes: int = Field(gt=0)


class EventTypeList(BaseModel):
    items: List[EventType]
    total: int


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class Booking(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    eventTypeId: str
    startTime: datetime
    endTime: datetime
    guestName: str = Field(min_length=1, max_length=200)
    guestEmail: EmailStr = Field(max_length=254)
    guestNote: Optional[str] = Field(default=None, max_length=2000)
    createdAt: datetime


class BookingCreateRequest(BaseModel):
    eventTypeId: str
    startTime: datetime
    guestName: str = Field(min_length=1, max_length=200)
    guestEmail: EmailStr = Field(max_length=254)
    guestNote: Optional[str] = Field(default=None, max_length=2000)


class BookingList(BaseModel):
    items: List[Booking]
    total: int


# ---------------------------------------------------------------------------
# Slots & booking window
# ---------------------------------------------------------------------------

class TimeSlot(BaseModel):
    startTime: datetime
    endTime: datetime
    available: bool


class TimeSlotList(BaseModel):
    date: str           # ISO 8601 YYYY-MM-DD (owner's timezone)
    eventTypeId: str
    slots: List[TimeSlot]


class BookingWindow(BaseModel):
    windowStart: str    # YYYY-MM-DD (owner's timezone)
    windowEnd: str      # YYYY-MM-DD (owner's timezone)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class ValidationDetail(BaseModel):
    field: str
    issue: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[List[ValidationDetail]] = None
