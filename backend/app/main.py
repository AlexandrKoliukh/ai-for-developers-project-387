"""
FastAPI application entry point.

Start with:  uvicorn app.main:app --reload
Docs at:     http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import ErrorBody, ValidationDetail
from .routers import guest, owner
from .store import seed_default_event_types


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: populate in-memory store with default event types
    seed_default_event_types()
    yield
    # Shutdown: nothing to clean up for in-memory storage
    # DB integration point: close async connection pool / session factory here


app = FastAPI(
    title="Запись на звонок — Call Booking Service",
    version="0.0.0",
    description=(
        "Simplified call booking service inspired by Cal.com. "
        "No authentication required. One hardcoded calendar owner. "
        "Guests browse event types, pick time slots, and create bookings."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins (frontend is served from a separate port/domain)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# Map errors to the spec-defined ErrorBody shape {code, message, details?}.
# FastAPI's default wraps errors in {"detail": ...} which the frontend doesn't expect.
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Pass our dict errors through as-is; wrap plain strings in ErrorBody."""
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorBody(code="ERROR", message=str(exc.detail)).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Map Pydantic v2 validation errors to spec-defined 400 ErrorBody."""
    details = [
        ValidationDetail(
            field=".".join(str(loc) for loc in e["loc"]),
            issue=e["msg"],
        )
        for e in exc.errors()
    ]
    body = ErrorBody(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details=details,
    )
    return JSONResponse(status_code=400, content=body.model_dump())


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(guest.router)
app.include_router(owner.router)
