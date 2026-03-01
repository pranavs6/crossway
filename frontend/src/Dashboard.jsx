import React, { useState, useEffect } from 'react';
import CommuteMap from './CommuteMap';

const Dashboard = () => {
    const [journeys, setJourneys] = useState([]);
    const [isCustomTime, setIsCustomTime] = useState(false);
    const [customTime, setCustomTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('Never');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchJourneys(true); // Load cached on mount
        if (!isCustomTime) {
            const interval = setInterval(() => fetchJourneys(false), 60000);
            return () => clearInterval(interval);
        }
    }, [isCustomTime, customTime]);

    const fetchJourneys = async (useCache = false) => {
        setIsRefreshing(true);
        if (!useCache) setLoading(true);
        try {
            const payload = { use_cache: useCache };
            if (isCustomTime && customTime) payload.start_time = customTime;
            if (!useCache) delete payload.use_cache; // Force fresh calculation

            const res = await fetch('http://localhost:5001/api/journeys/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setJourneys(data);
                if (data.length > 0) setLastUpdated(new Date().toLocaleTimeString('en-GB'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    return (
        <div>
            {/* Always visible controls */}
            <div className="govuk-inset-text" style={{ padding: '20px', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 15px 0', fontSize: '24px' }}>Suggested Routes</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="govuk-radios__item" style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: 'auto', paddingLeft: 0, marginBottom: 0 }}>
                            <input
                                type="radio"
                                name="timeMode"
                                id="leave-now"
                                checked={!isCustomTime}
                                onChange={() => setIsCustomTime(false)}
                                style={{ width: '24px', height: '24px', margin: 0, position: 'static', opacity: 1 }}
                            />
                            <label htmlFor="leave-now" className="govuk-label" style={{ marginBottom: 0, fontSize: '16px', cursor: 'pointer' }}>Leave Now</label>
                        </div>
                        <div className="govuk-radios__item" style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: 'auto', paddingLeft: 0, marginBottom: 0 }}>
                            <input
                                type="radio"
                                name="timeMode"
                                id="leave-at"
                                checked={isCustomTime}
                                onChange={() => setIsCustomTime(true)}
                                style={{ width: '24px', height: '24px', margin: 0, position: 'static', opacity: 1 }}
                            />
                            <label htmlFor="leave-at" className="govuk-label" style={{ marginBottom: 0, fontSize: '16px', cursor: 'pointer' }}>Leave At...</label>
                        </div>
                        {isCustomTime && (
                            <input
                                type="datetime-local"
                                className="govuk-input"
                                value={customTime}
                                onChange={(e) => setCustomTime(e.target.value)}
                                style={{ marginTop: '5px' }}
                            />
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: '#484949', marginBottom: '5px' }}>Updated: {lastUpdated}</div>
                        <button onClick={() => fetchJourneys(false)} disabled={isRefreshing} className="govuk-button" style={{ marginBottom: 0 }}>
                            {isRefreshing ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </div>
            </div>

            {loading && journeys.length === 0 ? (
                <div className="govuk-inset-text">Calculating...</div>
            ) : journeys.length === 0 ? (
                <div className="govuk-inset-text">No routes found. Check Configuration.</div>
            ) : (
                <div>
                    {journeys.map((group, groupIdx) => {
                        if (!group || !group.primary) return null;
                        const parking = group.primary.parking;

                        return (
                            <div key={groupIdx} style={{ marginBottom: '60px' }}>
                                {/* Group Header with Parking Info */}
                                <div style={{ marginBottom: '20px', borderBottom: '1px solid #b1b4b6', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <h2 className="govuk-heading-m" style={{ marginBottom: 0 }}>
                                        Via {group.primary.source_station}
                                    </h2>
                                    {parking && (
                                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#505a5f', fontWeight: 'bold' }}>Two Wheeler</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                                    <span style={{ color: parking.two_wheeler.available < 50 ? '#d4351c' : '#00703c' }}>
                                                        {parking.two_wheeler.available}
                                                    </span>
                                                    <span style={{ fontSize: '14px', color: '#505a5f', fontWeight: 'normal' }}>/{parking.two_wheeler.total}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#505a5f', fontWeight: 'bold' }}>Four Wheeler</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                                    <span style={{ color: parking.four_wheeler.available < 10 ? '#d4351c' : '#00703c' }}>
                                                        {parking.four_wheeler.available}
                                                    </span>
                                                    <span style={{ fontSize: '14px', color: '#505a5f', fontWeight: 'normal' }}>/{parking.four_wheeler.total}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Primary Best Option */}
                                <div style={{ marginBottom: '20px' }}>
                                    <span className="govuk-tag govuk-tag--green" style={{ marginBottom: '10px' }}>Best Option</span>
                                    <JourneyCard journey={group.primary} />
                                </div>

                                {/* Next Departures Table */}
                                {group.next_departures && group.next_departures.length > 0 && (
                                    <div style={{ marginTop: '20px', padding: '0 5px' }}>
                                        <h3 className="govuk-heading-s" style={{ marginBottom: '10px', color: '#505a5f' }}>Other Departures</h3>
                                        <table className="govuk-table" style={{ fontSize: '14px' }}>
                                            <thead className="govuk-table__head">
                                                <tr className="govuk-table__row">
                                                    <th className="govuk-table__header">Leave Home</th>
                                                    <th className="govuk-table__header">Station</th>
                                                    <th className="govuk-table__header">Train</th>
                                                    <th className="govuk-table__header">Arrive Work</th>
                                                    <th className="govuk-table__header">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="govuk-table__body">
                                                {group.next_departures.map((journey, idx) => (
                                                    <tr className="govuk-table__row" key={idx}>
                                                        <td className="govuk-table__cell" style={{ fontWeight: 'bold' }}>{journey.timings?.leave_home}</td>
                                                        <td className="govuk-table__cell">{journey.timings?.reach_station}</td>
                                                        <td className="govuk-table__cell">
                                                            {journey.timings?.train_departs}
                                                            {journey.transfer_station && (
                                                                <span className="govuk-tag govuk-tag--yellow" style={{ marginLeft: '5px', fontSize: '10px', padding: '2px 5px' }}>
                                                                    Change
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="govuk-table__cell" style={{ fontWeight: 'bold' }}>{journey.timings?.reach_work}</td>
                                                        <td className="govuk-table__cell">{journey.durations?.total} mins</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const JourneyCard = ({ journey }) => {
    // Calculate simple half durations for arrows if split
    const halfMetro = Math.floor((journey.durations?.metro || 0) / 2);

    return (
        <div className="govuk-inset-text" style={{ padding: '20px', marginBottom: '20px' }}>
            {/* Top row: Times and Map side by side */}
            <div className="govuk-grid-row">
                {/* Left: Journey Times */}
                <div className="govuk-grid-column-one-half">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                            <div style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1' }}>{journey.timings?.leave_home || '--'}</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '5px' }}>{journey.source_station}</div>
                        </div>
                        <div style={{ color: '#484949', fontSize: '16px' }}>to</div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1' }}>{journey.timings?.reach_work || '--'}</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '5px' }}>{journey.dest_station}</div>
                        </div>
                    </div>
                </div>

                {/* Right: Map */}
                <div className="govuk-grid-column-one-half">
                    <div style={{
                        width: '100%',
                        height: '250px',
                        border: '1px solid #cecece',
                        overflow: 'hidden'
                    }}>
                        <CommuteMap activeJourney={journey} />
                    </div>
                </div>
            </div>

            {/* Bottom row: Full-width Compact Timeline */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '15px',
                paddingTop: '15px',
                borderTop: '1px solid #cecece',
                fontSize: '12px',
                gap: '5px'
            }}>
                <TimeStop time={journey.timings?.leave_home || '--'} label="Home" />
                <Arrow duration={journey.durations?.drive || 0} />
                <TimeStop time={journey.timings?.reach_station || '--'} label="Station" />
                <Arrow duration={journey.durations?.wait || 0} />
                <TimeStop time={journey.timings?.train_departs || '--'} label="Board" />

                {journey.transfer_station ? (
                    <>
                        <Arrow duration={halfMetro} />
                        <TimeStop
                            time={<>
                                <span style={{ display: 'block', fontSize: '14px', lineHeight: '1' }}>{journey.timings?.transfer_arr || '--'}</span>
                                <span style={{ display: 'block', fontSize: '14px', color: '#d4351c', lineHeight: '1', marginTop: '2px' }}>{journey.timings?.transfer_dep || '--'}</span>
                            </>}
                            label={`Transfer @ ${journey.transfer_station}`}
                            style={{ minWidth: '90px', background: '#f8f8f8', padding: '4px', borderRadius: '4px', border: '1px solid #e0e0e0' }}
                        />
                        <Arrow duration={halfMetro} />
                    </>
                ) : (
                    <Arrow duration={journey.durations?.metro || 0} />
                )}

                <TimeStop time={journey.timings?.train_arrives || '--'} label="Alight" />
                <Arrow duration={journey.durations?.walk || 0} />
                <TimeStop time={journey.timings?.reach_work || '--'} label="Work" />
            </div>
        </div>
    );
};

const TimeStop = ({ time, label, style = {} }) => (
    <div style={{ textAlign: 'center', minWidth: '55px', flex: '0 0 auto', ...style }}>
        <div style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.2' }}>{time}</div>
        <div style={{ fontSize: '11px', color: '#484949', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>{label}</div>
    </div>
);

const Arrow = ({ duration }) => (
    <div style={{
        flex: '1 1 auto',
        minWidth: '20px',
        textAlign: 'center',
        position: 'relative',
        height: '2px',
        background: '#cecece',
        margin: '0 5px'
    }}>
        <span style={{
            position: 'absolute',
            top: '-9px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#f4f8fb',
            padding: '0 4px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#484949',
            lineHeight: '1.2'
        }}>
            {duration > 0 ? `${duration}m` : ''}
        </span>
    </div>
);

export default Dashboard;
