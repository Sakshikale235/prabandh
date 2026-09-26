from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from ..supabase import get_supabase


router = APIRouter(
    prefix="/operations",
    tags=["live-operations"],
)

EVENT_SLUG = "coldplay-dy-patil"


# ============================================================
# AUTHENTICATION
# ============================================================

def _bearer_user(authorization: str | None):
    """
    Validate the Supabase access token sent by the frontend.

    Frontend sends:
        Authorization: Bearer <supabase_access_token>
    """

    if not authorization:
        print("PRABANDH AUTH: No Authorization header received.")
        return None

    if not authorization.lower().startswith("bearer "):
        print("PRABANDH AUTH: Authorization header is not Bearer.")
        return None

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        print("PRABANDH AUTH: Bearer token is empty.")
        return None

    try:
        response = get_supabase().auth.get_user(token)

        if not response or not response.user:
            print("PRABANDH AUTH: Supabase returned no user.")
            return None

        print(
            f"PRABANDH AUTH: authenticated user {response.user.id}"
        )

        return response.user

    except Exception as exc:
        print(
            f"PRABANDH AUTH ERROR: "
            f"{type(exc).__name__}: {exc}"
        )
        return None


def _require_user(authorization: str | None):
    user = _bearer_user(authorization)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authenticated PRABANDH session required.",
        )

    return user


# ============================================================
# DATABASE HELPERS
# ============================================================

def _profile(user_id: str):
    db = get_supabase()

    result = (
        db.table("profiles")
        .select("id,full_name,role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    return result.data or {}


def _event(event_slug: str):
    db = get_supabase()

    result = (
        db.table("events")
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
    Get the venue associated with the event.

    The actual venues table does NOT contain a `city` column.
    """

    db = get_supabase()

    result = (
        db.table("venues")
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


def _organizer(authorization: str | None):
    user = _require_user(authorization)

    profile = _profile(user.id)

    if profile.get("role") != "organizer":
        raise HTTPException(
            status_code=403,
            detail="Organizer access required.",
        )

    return user


# ============================================================
# REQUEST MODELS
# ============================================================

class ScanRequest(BaseModel):
    gate_id: str

    ticket_reference: str | None = Field(
        default=None,
        max_length=120,
    )

    source: str = Field(
        default="scanner",
        max_length=40,
    )

    event_slug: str = EVENT_SLUG


class SurgeRequest(BaseModel):
    gate_id: str

    count: int = Field(
        default=100,
        ge=1,
        le=1000,
    )

    event_slug: str = EVENT_SLUG


class AssignRequest(BaseModel):
    gate_id: str

    volunteer_name: str | None = Field(
        default=None,
        max_length=120,
    )

    volunteer_user_id: str | None = None

    event_slug: str = EVENT_SLUG


# ============================================================
# LIVE EVENT STATE
# ============================================================

@router.get("/state")
def state(
    event_slug: str = Query(EVENT_SLUG),
    authorization: str | None = Header(default=None),
):
    """
    Return the complete live organizer state.

    This endpoint is intentionally read-only.
    """

    _require_user(authorization)

    event = _event(event_slug)
    db = get_supabase()

    venue = _venue(event["id"])

    # --------------------------------------------------------
    # Gates
    # --------------------------------------------------------

    gates_result = (
        db.table("gates")
        .select(
            "id,"
            "event_id,"
            "venue_id,"
            "zone_id,"
            "name,"
            "gate_code,"
            "capacity,"
            "current_occupancy,"
            "queue_count,"
            "estimated_wait_minutes,"
            "pressure_percent,"
            "pressure_level,"
            "latitude,"
            "longitude,"
            "is_open,"
            "metadata"
        )
        .eq("venue_id", venue["id"])
        .order("name")
        .execute()
    )

    gates = gates_result.data or []

    # --------------------------------------------------------
    # Gate live state
    # --------------------------------------------------------

    states_result = (
        db.table("gate_live_state")
        .select("*")
        .eq("event_id", event["id"])
        .execute()
    )

    states = states_result.data or []

    state_by_gate = {
        row["gate_id"]: row
        for row in states
        if row.get("gate_id")
    }

    # --------------------------------------------------------
    # Normalize gates for frontend
    # --------------------------------------------------------

    normalized_gates = []

    for gate in gates:

        metadata = gate.get("metadata") or {}

        live = state_by_gate.get(gate["id"])

        if live:

            current_entries = int(
                live.get("current_entries")
                or gate.get("current_occupancy")
                or 0
            )

            live_occupancy = live.get("occupancy_percent")

            if live_occupancy is not None:
                occupancy_percent = float(live_occupancy)

            elif gate.get("capacity"):
                occupancy_percent = (
                    current_entries
                    / int(gate["capacity"])
                    * 100
                )

            else:
                occupancy_percent = 0

            scan_velocity = float(
                live.get("scan_velocity_per_minute")
                or 0
            )

            pressure = (
                live.get("pressure")
                or gate.get("pressure_level")
                or "info"
            )

        else:

            current_entries = int(
                gate.get("current_occupancy") or 0
            )

            if gate.get("capacity"):
                occupancy_percent = (
                    current_entries
                    / int(gate["capacity"])
                    * 100
                )
            else:
                occupancy_percent = 0

            scan_velocity = 0

            pressure = (
                gate.get("pressure_level")
                or "info"
            )

        normalized_gate = {
            **gate,

            "map_x": metadata.get("map_x"),
            "map_y": metadata.get("map_y"),

            "live": {
                "current_entries": current_entries,
                "occupancy_percent": round(
                    occupancy_percent,
                    2,
                ),
                "scan_velocity_per_minute": scan_velocity,
                "pressure": pressure,
            },
        }

        normalized_gates.append(normalized_gate)

    # --------------------------------------------------------
    # Volunteer assignments
    #
    # Actual volunteer_assignments schema:
    #
    # id
    # event_id
    # volunteer_id
    # gate_id
    # zone_id
    # assignment_type
    # status
    # assigned_at
    # completed_at
    # notes
    # created_at
    # updated_at
    # --------------------------------------------------------

    assignments_result = (
        db.table("volunteer_assignments")
        .select(
            "id,"
            "event_id,"
            "volunteer_id,"
            "gate_id,"
            "zone_id,"
            "assignment_type,"
            "status,"
            "assigned_at,"
            "completed_at,"
            "notes,"
            "created_at,"
            "updated_at"
        )
        .eq("event_id", event["id"])
        .in_(
            "status",
            [
                "pending",
                "accepted",
                "in_progress",
            ],
        )
        .order("assigned_at", desc=True)
        .execute()
    )

    assignments = assignments_result.data or []

    # --------------------------------------------------------
    # Resolve volunteer information
    #
    # volunteer_assignments.volunteer_id
    #       -> volunteers.id
    #
    # volunteers.user_id
    #       -> profiles.id
    # --------------------------------------------------------

    volunteer_ids = list(
        {
            row["volunteer_id"]
            for row in assignments
            if row.get("volunteer_id")
        }
    )

    volunteers_by_id = {}

    if volunteer_ids:

        volunteers_result = (
            db.table("volunteers")
            .select(
                "id,"
                "user_id,"
                "event_id,"
                "assigned_zone_id,"
                "assigned_gate_id,"
                "status,"
                "latitude,"
                "longitude,"
                "skills,"
                "shift_start,"
                "shift_end"
            )
            .in_("id", volunteer_ids)
            .execute()
        )

        volunteers_by_id = {
            row["id"]: row
            for row in (volunteers_result.data or [])
        }

    profile_ids = list(
        {
            volunteer["user_id"]
            for volunteer in volunteers_by_id.values()
            if volunteer.get("user_id")
        }
    )

    profiles_by_id = {}

    if profile_ids:

        profiles_result = (
            db.table("profiles")
            .select(
                "id,"
                "full_name,"
                "role"
            )
            .in_("id", profile_ids)
            .execute()
        )

        profiles_by_id = {
            row["id"]: row
            for row in (profiles_result.data or [])
        }

    volunteers = []

    for assignment in assignments:

        volunteer = volunteers_by_id.get(
            assignment.get("volunteer_id")
        )

        if volunteer:

            profile = profiles_by_id.get(
                volunteer.get("user_id"),
                {}
            )

            volunteers.append(
                {
                    **assignment,

                    "volunteer": {
                        **volunteer,

                        "full_name": profile.get(
                            "full_name"
                        ),

                        "role": profile.get(
                            "role"
                        ),
                    },
                }
            )

        else:

            volunteers.append(assignment)

    # --------------------------------------------------------
    # Alerts
    # --------------------------------------------------------

    alerts_result = (
        db.table("alerts")
        .select("*")
        .eq("event_id", event["id"])
        .in_(
            "status",
            [
                "open",
                "acknowledged",
                "in_progress",
            ],
        )
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    alerts = alerts_result.data or []

    # --------------------------------------------------------
    # Recommendations
    # --------------------------------------------------------

    recommendations_result = (
        db.table("recommendations")
        .select("*")
        .eq("event_id", event["id"])
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    recommendations = (
        recommendations_result.data or []
    )

    # --------------------------------------------------------
    # Recent ticket scans
    #
    # Actual ticket_scans schema:
    #
    # id
    # event_id
    # gate_id
    # ticket_reference
    # attendee_id
    # scanned_at
    # scan_source
    # metadata
    # created_at
    # --------------------------------------------------------

    scans_result = (
        db.table("ticket_scans")
        .select(
            "id,"
            "gate_id,"
            "ticket_reference,"
            "attendee_id,"
            "scanned_at,"
            "scan_source,"
            "metadata"
        )
        .eq("event_id", event["id"])
        .order("scanned_at", desc=True)
        .limit(20)
        .execute()
    )

    scans = scans_result.data or []

    # --------------------------------------------------------
    # Venue metrics
    # --------------------------------------------------------

    total_entries = sum(
        int(
            gate["live"].get("current_entries")
            or 0
        )
        for gate in normalized_gates
    )

    total_capacity = sum(
        int(
            gate.get("capacity")
            or 0
        )
        for gate in normalized_gates
    )

    venue_occupancy_percent = (
        round(
            total_entries
            / total_capacity
            * 100,
            2,
        )
        if total_capacity
        else 0
    )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "event": event,

        "venue": venue,

        "gates": normalized_gates,

        "volunteers": volunteers,

        "alerts": alerts,

        "recommendations": recommendations,

        "recent_scans": scans,

        "metrics": {
            "total_entries": total_entries,

            "total_capacity": total_capacity,

            "venue_occupancy_percent": (
                venue_occupancy_percent
            ),

            "open_alerts": len(
                [
                    alert
                    for alert in alerts
                    if alert.get("status") == "open"
                ]
            ),

            "pending_recommendations": len(
                [
                    recommendation
                    for recommendation in recommendations
                    if not recommendation.get(
                        "is_selected"
                    )
                ]
            ),
        },

        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }


# ============================================================
# TICKET SCANNING
# ============================================================

@router.post("/ticket-scan")
def ticket_scan(
    payload: ScanRequest,
    authorization: str | None = Header(default=None),
):
    user = _organizer(authorization)

    event = _event(payload.event_slug)

    ticket_reference = (
        payload.ticket_reference
        or (
            "CP-"
            + datetime.now(timezone.utc)
            .strftime("%H%M%S%f")[:10]
        )
    )

    try:

        result = (
            get_supabase()
            .rpc(
                "process_ticket_scan",
                {
                    "p_event_id": event["id"],
                    "p_gate_id": payload.gate_id,
                    "p_ticket_reference": ticket_reference,
                    "p_source": payload.source,
                    "p_scanned_by": user.id,
                },
            )
            .execute()
        )

        return {
            "success": True,
            "ticket_reference": ticket_reference,
            "result": result.data,
        }

    except Exception as exc:

        print(
            f"PRABANDH TICKET SCAN ERROR: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=f"Ticket scan failed: {exc}",
        ) from exc


# ============================================================
# CROWD SURGE SIMULATION
# ============================================================

@router.post("/crowd-surge")
def crowd_surge(
    payload: SurgeRequest,
    authorization: str | None = Header(default=None),
):
    user = _organizer(authorization)

    event = _event(payload.event_slug)

    try:

        result = (
            get_supabase()
            .rpc(
                "simulate_gate_surge",
                {
                    "p_event_id": event["id"],
                    "p_gate_id": payload.gate_id,
                    "p_count": payload.count,
                    "p_actor": user.id,
                },
            )
            .execute()
        )

        return {
            "success": True,
            "count": payload.count,
            "result": result.data,
        }

    except Exception as exc:

        print(
            f"PRABANDH CROWD SURGE ERROR: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=f"Crowd surge simulation failed: {exc}",
        ) from exc


# ============================================================
# VOLUNTEER ASSIGNMENT
# ============================================================

@router.post("/volunteers/assign")
def assign_volunteer(
    payload: AssignRequest,
    authorization: str | None = Header(default=None),
):
    user = _organizer(authorization)

    event = _event(payload.event_slug)

    db = get_supabase()

    try:

        # ----------------------------------------------------
        # Volunteer ID is required.
        #
        # volunteers.user_id identifies the Supabase user.
        # volunteers.id is the actual volunteer record ID.
        # ----------------------------------------------------

        if not payload.volunteer_user_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "volunteer_user_id is required "
                    "to assign a volunteer."
                ),
            )

        volunteer_result = (
            db.table("volunteers")
            .select(
                "id,"
                "user_id,"
                "event_id,"
                "assigned_zone_id,"
                "assigned_gate_id,"
                "status"
            )
            .eq("event_id", event["id"])
            .eq(
                "user_id",
                payload.volunteer_user_id
            )
            .maybe_single()
            .execute()
        )

        volunteer = volunteer_result.data

        if not volunteer:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Volunteer not found for this event."
                ),
            )

        # ----------------------------------------------------
        # Verify gate belongs to event
        # ----------------------------------------------------

        gate_result = (
            db.table("gates")
            .select(
                "id,"
                "event_id,"
                "zone_id,"
                "name"
            )
            .eq("id", payload.gate_id)
            .eq("event_id", event["id"])
            .maybe_single()
            .execute()
        )

        gate = gate_result.data

        if not gate:
            raise HTTPException(
                status_code=404,
                detail="Gate not found for this event.",
            )

        # ----------------------------------------------------
        # Create assignment
        #
        # Actual schema:
        #   volunteer_id
        #   gate_id
        #   zone_id
        #   assignment_type
        #   status
        #   assigned_at
        #   notes
        # ----------------------------------------------------

        assignment_row = {
            "event_id": event["id"],
            "volunteer_id": volunteer["id"],
            "gate_id": payload.gate_id,
            "zone_id": gate.get("zone_id"),
            "assignment_type": "gate",
            "status": "in_progress",
            "assigned_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "notes": (
                f"Assigned by organizer {user.id}"
            ),
        }

        result = (
            db.table("volunteer_assignments")
            .insert(assignment_row)
            .execute()
        )

        # ----------------------------------------------------
        # Update volunteer's current gate assignment
        # ----------------------------------------------------

        try:

            (
                db.table("volunteers")
                .update(
                    {
                        "assigned_gate_id": payload.gate_id,
                        "assigned_zone_id": gate.get(
                            "zone_id"
                        ),
                        "status": "assigned",
                        "updated_at": datetime.now(
                            timezone.utc
                        ).isoformat(),
                    }
                )
                .eq(
                    "id",
                    volunteer["id"]
                )
                .execute()
            )

        except Exception as volunteer_update_exc:

            print(
                "PRABANDH VOLUNTEER UPDATE WARNING: "
                f"{volunteer_update_exc}"
            )

        # ----------------------------------------------------
        # Operational action
        # ----------------------------------------------------

        action = {
            "event_id": event["id"],
            "assigned_to": payload.volunteer_user_id,
            "action_type": "volunteer_assignment",
            "title": "Volunteer assigned",
            "description": (
                f"Volunteer assigned to "
                f"gate {gate.get('name') or payload.gate_id}."
            ),
            "status": "completed",
            "priority": "medium",
            "source": "organizer",
            "before_state": {
                "assigned_gate_id": (
                    volunteer.get("assigned_gate_id")
                ),
                "assigned_zone_id": (
                    volunteer.get("assigned_zone_id")
                ),
            },
            "after_state": {
                "volunteer_id": volunteer["id"],
                "gate_id": payload.gate_id,
                "zone_id": gate.get("zone_id"),
                "assignment_type": "gate",
            },
            "completed_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        try:

            (
                db.table("operational_actions")
                .insert(action)
                .execute()
            )

        except Exception as action_exc:

            print(
                "PRABANDH OPERATIONAL ACTION WARNING: "
                f"{action_exc}"
            )

        return (
            result.data[0]
            if result.data
            else assignment_row
        )

    except HTTPException:
        raise

    except Exception as exc:

        print(
            f"PRABANDH VOLUNTEER ASSIGNMENT ERROR: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail="Volunteer assignment could not be saved.",
        ) from exc


# ============================================================
# ALERT ACKNOWLEDGEMENT
# ============================================================

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    authorization: str | None = Header(default=None),
):
    user = _organizer(authorization)

    try:

        now = datetime.now(
            timezone.utc
        ).isoformat()

        result = (
            get_supabase()
            .table("alerts")
            .update(
                {
                    "status": "acknowledged",
                    "acknowledged_at": now,
                    "acknowledged_by": user.id,
                }
            )
            .eq("id", alert_id)
            .execute()
        )

        return (
            result.data[0]
            if result.data
            else {
                "id": alert_id,
                "status": "acknowledged",
            }
        )

    except Exception as exc:

        print(
            f"PRABANDH ALERT ACK ERROR: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail="Alert could not be acknowledged.",
        ) from exc