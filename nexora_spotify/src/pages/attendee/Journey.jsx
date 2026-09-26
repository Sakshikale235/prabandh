import React, { useMemo, useState } from 'react';
import {
    ArrowRight,
    BusFront,
    CarFront,
    Clock3,
    LocateFixed,
    MapPin,
    Navigation,
    RefreshCw,
    Route,
    Search,
    ShieldCheck,
    Sparkles,
    TrainFront,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import { useJourney } from '../../context/JourneyContext';
import hero from '../../assets/concert-hero.jpg';

const iconFor = (mode) => {
    if (mode === 'Train') {
        return <TrainFront />;
    }

    if (mode === 'Bus' || mode === 'Shuttle') {
        return <BusFront />;
    }

    if (mode === 'Walk') {
        return <Navigation />;
    }

    return <CarFront />;
};

export default function Journey() {
    const {
        origin,
        setOrigin,
        location,
        useBrowserLocation,
        schedules,
        route,
        loading,
        source,
        error,
        selectedMode,
        setSelectedMode,
        reload,
        saveJourney,
        lastUpdated,
        selectedSchedule,
        setSelectedSchedule,
    } = useJourney();

    const [planned, setPlanned] = useState(false);
    const [saving, setSaving] = useState(false);

    const modes = ['All', 'Train', 'Bus', 'Shuttle'];

    const arrivalOptions = useMemo(
        () =>
            schedules.filter((schedule) =>
                ['Train', 'Bus', 'Shuttle'].includes(schedule.mode)
            ),
        [schedules]
    );

    const handlePlanJourney = async () => {
        try {
            setSaving(true);

            await saveJourney(selectedSchedule);

            setPlanned(true);
        } catch (err) {
            console.error('Unable to save journey:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageHeader
                eyebrow="ATTENDEE · JOURNEY PLANNER"
                title="From your doorstep to DY Patil."
                subtitle="Plan the complete approach to Coldplay with live route options, fixed transit schedules and a crowd-aware event handoff."
                action={
                    <button className="outline-btn" onClick={reload}>
                        <RefreshCw size={16} />
                        Refresh live data
                    </button>
                }
            />

            {/* ============================================================
          HERO
      ============================================================ */}

            <div className="journey-hero">
                <img src={hero} alt="Coldplay concert" />

                <div className="journey-hero-overlay" />

                <div>
                    <span className="eyebrow">
                        COLDPLAY · D.Y. PATIL STADIUM
                    </span>

                    <h2>One journey. Every connection.</h2>

                    <p>
                        Choose where you start. PRABANDH can hand you from home,
                        through public transport, all the way to the event gate.
                    </p>
                </div>
            </div>

            {/* ============================================================
          JOURNEY GRID
      ============================================================ */}

            <div className="journey-grid">

                {/* ==========================================================
            JOURNEY PLANNER
        ========================================================== */}

                <section className="panel journey-planner">
                    <div className="panel-head">
                        <div>
                            <h3>
                                <MapPin />
                                Start your journey
                            </h3>

                            <p>
                                Your starting point can be typed or taken from device
                                location.
                            </p>
                        </div>

                        <span className={`source-pill ${source}`}>
                            ● {source === 'api' ? 'LIVE API' : 'DEMO DATA'}
                        </span>
                    </div>

                    <div className="journey-form">
                        <label>
                            Starting point

                            <input
                                value={origin}
                                onChange={(event) => setOrigin(event.target.value)}
                                placeholder="Dombivli"
                            />
                        </label>

                        <button
                            className="locate-btn"
                            onClick={useBrowserLocation}
                        >
                            <LocateFixed size={16} />
                            Use my location
                        </button>

                        <div className="destination">
                            <span>TO</span>

                            <b>D.Y. Patil Stadium</b>

                            <small>
                                Navi Mumbai · Coldplay
                            </small>
                        </div>
                    </div>

                    {location && (
                        <div className="location-confirm">
                            <LocateFixed size={15} />

                            Device location captured · ±
                            {location.accuracy}m

                            <button
                                onClick={() =>
                                    setOrigin('My current location')
                                }
                            >
                                Use as origin
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="journey-note">
                            {error}
                        </div>
                    )}

                    <div className="journey-action-row">
                        <button
                            className="primary-btn journey-cta"
                            onClick={handlePlanJourney}
                            disabled={saving || loading}
                        >
                            <Route size={17} />

                            {saving ? 'Saving…' : 'Plan my journey'}

                            <ArrowRight size={16} />
                        </button>

                        <a
                            className="outline-btn journey-map-link"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                                origin
                            )}&destination=${encodeURIComponent(
                                'D.Y. Patil Stadium, Navi Mumbai'
                            )}`}
                        >
                            <MapPin size={15} />
                            Open map
                        </a>
                    </div>
                </section>

                {/* ==========================================================
            RECOMMENDED ROUTE
        ========================================================== */}

                <section className="panel route-summary-panel">
                    <div className="panel-head">
                        <div>
                            <h3>
                                <Sparkles />
                                Recommended journey
                            </h3>

                            <p>
                                Optimized for the event approach. Gate choice updates
                                later from live crowd signals.
                            </p>
                        </div>
                    </div>

                    <div className="route-kpis">
                        <div>
                            <span>EST. ARRIVAL</span>
                            <b>{route?.arrival || '--'}</b>
                        </div>

                        <div>
                            <span>DISTANCE</span>
                            <b>{route?.distance || '--'}</b>
                        </div>

                        <div>
                            <span>TOTAL TIME</span>
                            <b>{route?.duration || '--'}</b>
                        </div>
                    </div>

                    <div className="route-path">
                        {(route?.steps || []).map((step, index) => (
                            <div
                                className="journey-step"
                                key={`${step.from}-${step.to}-${index}`}
                            >
                                <div className="step-icon">
                                    {iconFor(step.mode)}
                                </div>

                                <div className="step-copy">
                                    <span>
                                        {step.mode?.toUpperCase()}
                                    </span>

                                    <b>
                                        {step.from}

                                        <ArrowRight size={13} />

                                        {step.to}
                                    </b>

                                    <small>
                                        {step.detail}
                                    </small>
                                </div>

                                <strong>
                                    {step.duration}
                                </strong>
                            </div>
                        ))}
                    </div>

                    {planned && (
                        <div className="planned-banner">
                            <ShieldCheck size={17} />

                            <div>
                                <b>Journey saved</b>

                                <small>
                                    Your plan is ready. When you reach the stadium,
                                    PRABANDH can switch you into live gate guidance.
                                </small>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* ============================================================
          TRANSPORT SCHEDULES
      ============================================================ */}

            <section className="panel schedules-panel">
                <div className="panel-head">
                    <div>
                        <h3>
                            <Clock3 />
                            Scheduled transport
                        </h3>

                        <p>
                            Fixed timetables are shown as schedules; live status is
                            displayed separately when available.
                        </p>
                    </div>

                    <span className="updated-tag">
                        Updated{' '}
                        {lastUpdated
                            ? lastUpdated.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : '--'}
                    </span>
                </div>

                {/* ==========================================================
            MODE FILTERS
        ========================================================== */}

                <div className="mode-tabs journey-tabs">
                    {modes.map((mode) => (
                        <button
                            key={mode}
                            className={
                                selectedMode === mode
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setSelectedMode(mode)
                            }
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                {/* ==========================================================
            SCHEDULE CARDS
        ========================================================== */}

                <div className="schedule-grid">
                    {schedules.map((schedule) => (
                        <button
                            type="button"
                            className={`schedule-card ${selectedSchedule?.id === schedule.id
                                    ? 'selected'
                                    : ''
                                }`}
                            key={schedule.id}
                            onClick={() =>
                                setSelectedSchedule(schedule)
                            }
                            aria-pressed={
                                selectedSchedule?.id === schedule.id
                            }
                        >
                            <div className="schedule-icon">
                                {iconFor(schedule.mode)}
                            </div>

                            <div className="schedule-main">
                                <span>
                                    {schedule.operator} ·{' '}
                                    {schedule.frequency}
                                </span>

                                <h3>
                                    {schedule.service}
                                </h3>

                                <p>
                                    {schedule.departure}

                                    <ArrowRight size={13} />

                                    {schedule.arrival}
                                </p>
                            </div>

                            <div className="schedule-side">
                                <b>
                                    {schedule.duration}
                                </b>

                                <small>
                                    {schedule.status}
                                </small>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ==========================================================
            SELECTED SCHEDULE
        ========================================================== */}

                {selectedSchedule && (
                    <div className="selected-schedule-note">
                        <ShieldCheck size={15} />

                        Selected:{' '}

                        <b>
                            {selectedSchedule.service}
                        </b>

                        {' '}at{' '}

                        <b>
                            {selectedSchedule.departure}
                        </b>
                        .

                        {' '}Plan your journey to save this option.
                    </div>
                )}

                {/* ==========================================================
            EMPTY STATE
        ========================================================== */}

                {arrivalOptions.length === 0 && (
                    <div className="empty-state">
                        <Search />

                        No scheduled services match this filter.
                    </div>
                )}
            </section>

            {/* ============================================================
          ROUTE MAP
      ============================================================ */}

            <section className="journey-map-card">
                <div className="route-map-art">

                    <div className="route-node start">
                        <span>D</span>

                        <b>
                            {origin}
                        </b>
                    </div>

                    <div className="route-segment one">
                        <i />
                        <i />
                        <i />
                    </div>

                    <div className="route-node mid">
                        <span>V</span>

                        <b>Vashi</b>
                    </div>

                    <div className="route-segment two">
                        <i />
                        <i />
                        <i />
                    </div>

                    <div className="route-node end">
                        <span>DP</span>

                        <b>DY Patil</b>
                    </div>

                </div>

                <div className="journey-map-copy">
                    <span className="eyebrow">
                        ROUTE PREVIEW
                    </span>

                    <h3>
                        {origin} → DY Patil Stadium
                    </h3>

                    <p>
                        PRABANDH keeps the journey module independent,
                        but the arrival state can hand off directly into
                        the live gate and venue experience.
                    </p>

                    <div className="handoff">
                        <span>
                            <MapPin />
                            Arrival
                        </span>

                        <b>
                            Gate recommendation becomes live after entry
                            conditions are known.
                        </b>
                    </div>
                </div>
            </section>
        </>
    );
}