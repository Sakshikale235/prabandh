from math import hypot
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from ..supabase import get_supabase


router = APIRouter(
    prefix="/resources",
    tags=["venue-and-partner-resources"],
)

EVENT_SLUG = "coldplay-dy-patil"


# ============================================================
# AUTH / COMMON HELPERS
# ============================================================

def _bearer_user(authorization: str | None):
    if not authorization:
        return None

    if not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        return None

    try:
        return get_supabase().auth.get_user(token).user
    except Exception:
        return None


def _require_user(authorization: str | None):
    user = _bearer_user(authorization)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authenticated PRABANDH session required.",
        )

    return user


def _profile(user_id: str):
    result = (
        get_supabase()
        .table("profiles")
        .select("id,full_name,role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    return result.data or {}


def _event(event_slug: str = EVENT_SLUG):
    result = (
        get_supabase()
        .table("events")
        .select("id,slug,name")
        .eq("slug", event_slug)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Event not found.",
        )

    return result.data


def _venue(event_id: str):
    """
    Uses only columns known to exist in the actual venues table.
    """

    result = (
        get_supabase()
        .table("venues")
        .select(
            "id,"
            "name,"
            "address,"
            "latitude,"
            "longitude,"
            "floor_plan_url,"
            "metadata"
        )
        .eq("event_id", event_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Venue not found.",
        )

    return result.data[0]


def _is_organizer(user_id: str):
    return _profile(user_id).get("role") == "organizer"


def _is_partner_or_owner(user, partner: dict):
    profile = _profile(user.id)

    return (
        profile.get("role") == "partner"
        or partner.get("owner_user_id") == user.id
    )


# ============================================================
# REQUEST MODELS
# ============================================================

class LocationPayload(BaseModel):
    name: str = Field(min_length=1, max_length=160)

    resource_type: str = Field(
        min_length=1,
        max_length=60,
    )

    zone_id: str | None = None

    status: str = "available"

    capacity: int | None = Field(
        default=None,
        ge=0,
    )

    wait_minutes: int | None = Field(
        default=None,
        ge=0,
    )

    map_x: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    map_y: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    metadata: dict = Field(
        default_factory=dict,
    )

    event_slug: str = EVENT_SLUG


class AvailabilityPayload(BaseModel):
    partner_id: str

    event_slug: str = EVENT_SLUG

    available_units: int | None = Field(
        default=None,
        ge=0,
    )

    capacity: int | None = Field(
        default=None,
        ge=0,
    )

    wait_minutes: int | None = Field(
        default=None,
        ge=0,
    )

    discount_percent: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    status: str = "available"


class RequestResponsePayload(BaseModel):
    accepted: bool


# ============================================================
# VENUE
# ============================================================

@router.get("/venue")
def venue(
    event_slug: str = Query(EVENT_SLUG),
    authorization: str | None = Header(default=None),
):
    """
    Return complete venue information:
    event + venue + zones + gates + venue resources.
    """

    _require_user(authorization)

    event = _event(event_slug)
    db = get_supabase()

    v = _venue(event["id"])

    zones = (
        db.table("zones")
        .select("*")
        .eq("venue_id", v["id"])
        .order("name")
        .execute()
        .data
        or []
    )

    gates = (
        db.table("gates")
        .select("*")
        .eq("venue_id", v["id"])
        .order("name")
        .execute()
        .data
        or []
    )

    resources = (
        db.table("venue_resources")
        .select("*")
        .eq("venue_id", v["id"])
        .order("name")
        .execute()
        .data
        or []
    )

    return {
        "event": event,
        "venue": v,
        "zones": zones,
        "gates": gates,
        "resources": resources,
    }


# ============================================================
# CREATE VENUE LOCATION
# ============================================================

@router.post("/venue/locations")
def create_location(
    payload: LocationPayload,
    authorization: str | None = Header(default=None),
):
    """
    Create an internal venue resource.

    IMPORTANT:
    map_x, map_y and wait_minutes are stored inside metadata
    because they are not physical columns in venue_resources.
    """

    user = _require_user(authorization)

    if not _is_organizer(user.id):
        raise HTTPException(
            status_code=403,
            detail="Organizer access required.",
        )

    event = _event(payload.event_slug)
    venue = _venue(event["id"])
    db = get_supabase()

    metadata = dict(payload.metadata or {})

    if payload.map_x is not None:
        metadata["map_x"] = payload.map_x

    if payload.map_y is not None:
        metadata["map_y"] = payload.map_y

    if payload.wait_minutes is not None:
        metadata["wait_minutes"] = payload.wait_minutes

    row = {
        "event_id": event["id"],
        "venue_id": venue["id"],
        "zone_id": payload.zone_id,
        "resource_type": payload.resource_type,
        "name": payload.name,
        "capacity": payload.capacity or 0,
        "current_usage": 0,
        "status": payload.status,
        "metadata": metadata,
    }

    result = (
        db.table("venue_resources")
        .insert(row)
        .execute()
    )

    return (
        result.data[0]
        if result.data
        else row
    )


# ============================================================
# DELETE VENUE LOCATION
# ============================================================

@router.delete("/venue/locations/{resource_id}")
def delete_location(
    resource_id: str,
    authorization: str | None = Header(default=None),
):
    user = _require_user(authorization)

    if not _is_organizer(user.id):
        raise HTTPException(
            status_code=403,
            detail="Organizer access required.",
        )

    db = get_supabase()

    existing = (
        db.table("venue_resources")
        .select("id")
        .eq("id", resource_id)
        .maybe_single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Venue resource not found.",
        )

    result = (
        db.table("venue_resources")
        .delete()
        .eq("id", resource_id)
        .execute()
    )

    return {
        "deleted": bool(result.data),
        "id": resource_id,
    }


# ============================================================
# INTERNAL NAVIGATION
# ============================================================

@router.get("/navigation")
def navigation(
    resource_id: str,
    from_resource_id: str | None = None,
    event_slug: str = Query(EVENT_SLUG),
    authorization: str | None = Header(default=None),
):
    """
    Calculate simple internal venue navigation.

    Coordinates for venue_resources are stored in metadata:
        metadata.map_x
        metadata.map_y

    Gates may not have map coordinates in the actual DB,
    therefore gate navigation falls back to latitude/longitude
    or venue-center coordinates.
    """

    _require_user(authorization)

    event = _event(event_slug)
    venue = _venue(event["id"])
    db = get_supabase()

    # --------------------------------------------------------
    # TARGET RESOURCE
    # --------------------------------------------------------

    target = (
        db.table("venue_resources")
        .select(
            "id,"
            "name,"
            "resource_type,"
            "zone_id,"
            "status,"
            "latitude,"
            "longitude,"
            "metadata"
        )
        .eq("id", resource_id)
        .eq("venue_id", venue["id"])
        .maybe_single()
        .execute()
        .data
    )

    if target:
        target_meta = target.get("metadata") or {}

        target = {
            **target,
            "map_x": target_meta.get("map_x"),
            "map_y": target_meta.get("map_y"),
            "wait_minutes": target_meta.get("wait_minutes"),
        }

    # --------------------------------------------------------
    # TARGET GATE
    # --------------------------------------------------------

    if not target:
        gate = (
            db.table("gates")
            .select(
                "id,"
                "name,"
                "latitude,"
                "longitude,"
                "metadata"
            )
            .eq("id", resource_id)
            .eq("venue_id", venue["id"])
            .maybe_single()
            .execute()
            .data
        )

        if gate:
            gate_meta = gate.get("metadata") or {}

            target = {
                **gate,
                "resource_type": "gate",
                "map_x": gate_meta.get("map_x"),
                "map_y": gate_meta.get("map_y"),
            }

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Destination not found.",
        )

    # --------------------------------------------------------
    # ORIGIN
    # --------------------------------------------------------

    origin = None

    if from_resource_id:

        origin = (
            db.table("venue_resources")
            .select(
                "id,"
                "name,"
                "resource_type,"
                "latitude,"
                "longitude,"
                "metadata"
            )
            .eq("id", from_resource_id)
            .eq("venue_id", venue["id"])
            .maybe_single()
            .execute()
            .data
        )

        if origin:
            origin_meta = origin.get("metadata") or {}

            origin = {
                **origin,
                "map_x": origin_meta.get("map_x"),
                "map_y": origin_meta.get("map_y"),
            }

        if not origin:

            gate = (
                db.table("gates")
                .select(
                    "id,"
                    "name,"
                    "latitude,"
                    "longitude,"
                    "metadata"
                )
                .eq("id", from_resource_id)
                .eq("venue_id", venue["id"])
                .maybe_single()
                .execute()
                .data
            )

            if gate:
                gate_meta = gate.get("metadata") or {}

                origin = {
                    **gate,
                    "resource_type": "gate",
                    "map_x": gate_meta.get("map_x"),
                    "map_y": gate_meta.get("map_y"),
                }

    # --------------------------------------------------------
    # DEFAULT CURRENT LOCATION
    # --------------------------------------------------------

    if not origin:
        origin = {
            "id": "current",
            "name": "Current location",
            "map_x": 50,
            "map_y": 82,
        }

    # --------------------------------------------------------
    # MAP COORDINATES
    # --------------------------------------------------------

    ox = origin.get("map_x")
    oy = origin.get("map_y")

    tx = target.get("map_x")
    ty = target.get("map_y")

    # If coordinates are unavailable, use a safe default.
    if ox is None:
        ox = 50

    if oy is None:
        oy = 82

    if tx is None:
        tx = 50

    if ty is None:
        ty = 50

    ox = float(ox)
    oy = float(oy)
    tx = float(tx)
    ty = float(ty)

    venue_metadata = venue.get("metadata") or {}

    meters_per_unit = float(
        venue_metadata.get(
            "meters_per_map_unit",
            20,
        )
    )

    distance_m = round(
        hypot(
            tx - ox,
            ty - oy,
        )
        * meters_per_unit
    )

    dx = tx - ox
    dy = ty - oy

    if abs(dx) >= abs(dy):
        direction = "right" if dx > 0 else "left"
    else:
        direction = "forward" if dy < 0 else "back"

    steps = []

    if distance_m > 0:
        steps.append(
            {
                "instruction": (
                    f"Walk approximately "
                    f"{distance_m} m {direction}."
                ),
                "distance_m": distance_m,
                "direction": direction,
            }
        )

    return {
        "origin": origin,
        "destination": target,
        "distance_m": distance_m,
        "eta_minutes": max(
            1,
            round(distance_m / 80),
        ),
        "steps": steps,
        "source": "venue_coordinate_engine",
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# EXTERNAL PARTNERS
# ============================================================

@router.get("/external")
def external(
    partner_type: str | None = None,
    event_slug: str = Query(EVENT_SLUG),
    authorization: str | None = Header(default=None),
):
    """
    Return hotels/restaurants/other partners with latest
    event-specific availability.
    """

    _require_user(authorization)

    event = _event(event_slug)
    db = get_supabase()

    # Actual partners schema uses:
    # is_active
    # business_name

    partners_query = (
        db.table("partners")
        .select("*")
        .eq("is_active", True)
    )

    if partner_type:
        partners_query = partners_query.eq(
            "partner_type",
            partner_type,
        )

    partners = (
        partners_query
        .order("business_name")
        .execute()
        .data
        or []
    )

    partner_ids = [
        partner["id"]
        for partner in partners
    ]

    availability = []

    if partner_ids:
        availability = (
            db.table("partner_availability")
            .select("*")
            .eq("event_id", event["id"])
            .in_("partner_id", partner_ids)
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )

    # Keep only latest availability for each partner.
    latest = {}

    for item in availability:
        partner_id = item["partner_id"]

        if partner_id not in latest:
            latest[partner_id] = item

    rows = []

    for partner in partners:

        availability_row = latest.get(
            partner["id"],
            {},
        )

        metadata = partner.get(
            "metadata"
        ) or {}

        rows.append(
            {
                **partner,

                "availability": availability_row,

                # Preserve useful frontend fields.
                "rating": (
                    partner.get("rating")
                    if partner.get("rating") is not None
                    else metadata.get("rating")
                ),

                "distance_km": metadata.get(
                    "distance_km"
                ),

                "type": (
                    partner.get("partner_type")
                    or metadata.get("type")
                ),
            }
        )

    return {
        "event": event,
        "items": rows,
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# UPDATE PARTNER AVAILABILITY
# ============================================================

@router.post("/external/availability")
def update_external(
    payload: AvailabilityPayload,
    authorization: str | None = Header(default=None),
):
    """
    Partner updates availability.

    API fields are translated to actual DB columns:

        capacity      -> total_units
        wait_minutes  -> wait_time_minutes
        status        -> is_active
    """

    user = _require_user(authorization)

    profile = _profile(user.id)

    db = get_supabase()

    event = _event(payload.event_slug)

    partner = (
        db.table("partners")
        .select("*")
        .eq("id", payload.partner_id)
        .maybe_single()
        .execute()
        .data
    )

    if not partner:
        raise HTTPException(
            status_code=404,
            detail="Partner not found.",
        )

    if not _is_partner_or_owner(
        user,
        partner,
    ):
        raise HTTPException(
            status_code=403,
            detail="Partner access required.",
        )

    # --------------------------------------------------------
    # Existing availability
    # --------------------------------------------------------

    existing = (
        db.table("partner_availability")
        .select("id")
        .eq(
            "partner_id",
            payload.partner_id,
        )
        .eq(
            "event_id",
            event["id"],
        )
        .limit(1)
        .execute()
        .data
        or []
    )

    # --------------------------------------------------------
    # Translate API model -> actual DB columns
    # --------------------------------------------------------

    total_units = payload.capacity

    available_units = payload.available_units

    availability_percent = None

    if (
        total_units is not None
        and total_units > 0
        and available_units is not None
    ):
        availability_percent = round(
            (
                available_units
                / total_units
            )
            * 100,
            2,
        )

    row = {
        "partner_id": payload.partner_id,
        "event_id": event["id"],
        "available_units": (
            available_units
            if available_units is not None
            else 0
        ),
        "total_units": (
            total_units
            if total_units is not None
            else 0
        ),
        "wait_time_minutes": (
            payload.wait_minutes
            if payload.wait_minutes is not None
            else 0
        ),
        "discount_percent": (
            payload.discount_percent
        ),
        "availability_percent": (
            availability_percent
        ),
        "is_active": (
            payload.status.lower()
            not in {
                "inactive",
                "closed",
                "unavailable",
            }
        ),
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    # --------------------------------------------------------
    # Update or insert
    # --------------------------------------------------------

    if existing:

        result = (
            db.table("partner_availability")
            .update(row)
            .eq(
                "id",
                existing[0]["id"],
            )
            .execute()
        )

    else:

        result = (
            db.table("partner_availability")
            .insert(row)
            .execute()
        )

    if result.data:
        return result.data[0]

    return row


# ============================================================
# PARTNER REQUESTS
# ============================================================

@router.get("/requests")
def requests(
    event_slug: str = Query(EVENT_SLUG),
    authorization: str | None = Header(default=None),
):
    """
    Partner-request workflow is not enabled because the current
    Supabase schema does not contain partner_requests.

    Return an empty collection instead of generating a
    PGRST205 database error.

    The endpoint is intentionally retained so the frontend
    contract does not break.
    """

    _require_user(authorization)

    event = _event(event_slug)

    return {
        "event": event,
        "items": [],
        "supported": False,
        "message": (
            "Partner request workflow is not enabled "
            "because the partner_requests table is not "
            "present in the current database schema."
        ),
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# RESPOND TO PARTNER REQUEST
# ============================================================

@router.post("/requests/{request_id}")
def respond_request(
    request_id: str,
    payload: RequestResponsePayload,
    authorization: str | None = Header(default=None),
):
    """
    Partner-request response is intentionally disabled until
    partner_requests is introduced into the database schema.
    """

    _require_user(authorization)

    raise HTTPException(
        status_code=501,
        detail=(
            "Partner request workflow is not enabled. "
            "The partner_requests table does not exist "
            "in the current database schema."
        ),
    )