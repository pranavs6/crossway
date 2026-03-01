import React, { useState, useEffect } from 'react';

const PlaceManager = () => {
    const [places, setPlaces] = useState([]);
    const [stations, setStations] = useState([]);
    const [legs, setLegs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stations');

    const [legForm, setLegForm] = useState({
        sourceType: 'place', destType: 'station',
        sourceId: '', destId: '',
        distance: '', duration: '', ease: '3'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pRes, sRes, lRes] = await Promise.all([
                fetch('http://localhost:5001/api/places'),
                fetch('http://localhost:5001/api/stations'),
                fetch('http://localhost:5001/api/legs')
            ]);
            setPlaces(await pRes.json());
            setStations(await sRes.json());
            setLegs(await lRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleStationFlag = async (station, field) => {
        const newValue = !station[field];
        setStations(stations.map(s => s.id === station.id ? { ...s, [field]: newValue } : s));
        await fetch('http://localhost:5001/api/stations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: station.id, [field]: newValue })
        });
    };

    const handleAddPlace = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const res = await fetch('http://localhost:5001/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.get('name'),
                label: formData.get('label'),
                address: formData.get('address'),
                lat: formData.get('lat') || 0,
                lon: formData.get('lon') || 0
            })
        });
        if (res.ok) { e.target.reset(); fetchData(); }
    };

    const handleDeletePlace = async (id) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`http://localhost:5001/api/places/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleAddLeg = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:5001/api/legs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_type: legForm.sourceType, source_id: legForm.sourceId,
                dest_type: legForm.destType, dest_id: legForm.destId,
                distance_km: legForm.distance, duration_mins: legForm.duration, ease_rating: legForm.ease
            })
        });
        if (res.ok) fetchData();
    };

    const handleDeleteLeg = async (id) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`http://localhost:5001/api/legs?id=${id}`, { method: 'DELETE' });
        fetchData();
    };

    const renderOptions = (type) => {
        const data = type === 'place' ? places : stations;
        return data.map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
        ));
    };

    if (loading) return <div className="govuk-inset-text">Loading...</div>;

    return (
        <div>
            {/* Sub Tabs */}
            <nav className="govuk-tabs" style={{ marginBottom: '30px' }}>
                <ul className="govuk-tabs__list">
                    {['stations', 'places', 'legs'].map(tab => (
                        <li key={tab} className="govuk-tabs__list-item">
                            <button
                                onClick={() => setActiveTab(tab)}
                                className={`govuk-tabs__tab ${activeTab === tab ? 'govuk-tabs__tab--selected' : ''}`}
                            >
                                {tab === 'stations' ? 'Metro Stations' : tab === 'places' ? 'My Locations' : 'Journey Legs'}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* STATIONS TAB */}
            {activeTab === 'stations' && (
                <div>
                    <div className="govuk-inset-text">
                        <p>Mark <strong>Source</strong> (Start) and <strong>Destination</strong> (Work) stations.</p>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #cecece' }}>
                        <table className="govuk-table">
                            <thead>
                                <tr>
                                    <th className="govuk-table__header">Station Name</th>
                                    <th className="govuk-table__header" style={{ textAlign: 'center', width: '100px' }}>Source</th>
                                    <th className="govuk-table__header" style={{ textAlign: 'center', width: '100px' }}>Destination</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.map(s => (
                                    <tr key={s.id}>
                                        <td className="govuk-table__cell"><strong>{s.name}</strong> <span style={{ color: '#484949' }}>({s.code})</span></td>
                                        <td className="govuk-table__cell" style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={s.is_source || false}
                                                onChange={() => toggleStationFlag(s, 'is_source')}
                                                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td className="govuk-table__cell" style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={s.is_destination || false}
                                                onChange={() => toggleStationFlag(s, 'is_destination')}
                                                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PLACES TAB */}
            {activeTab === 'places' && (
                <div className="govuk-grid-row">
                    <div className="govuk-grid-column-one-half">
                        <h2>Add Location</h2>
                        <form onSubmit={handleAddPlace}>
                            <div className="govuk-form-group">
                                <label className="govuk-label">Name</label>
                                <input name="name" className="govuk-input" required placeholder="e.g. My House" />
                            </div>
                            <div className="govuk-form-group">
                                <label className="govuk-label">Label</label>
                                <select name="label" className="govuk-select">
                                    <option value="home">Home</option>
                                    <option value="work">Work</option>
                                </select>
                            </div>
                            <div className="govuk-grid-row">
                                <div className="govuk-grid-column-one-half">
                                    <div className="govuk-form-group">
                                        <label className="govuk-label" style={{ fontSize: '16px' }}>Latitude (Optional)</label>
                                        <input name="lat" className="govuk-input" step="any" type="number" />
                                    </div>
                                </div>
                                <div className="govuk-grid-column-one-half">
                                    <div className="govuk-form-group">
                                        <label className="govuk-label" style={{ fontSize: '16px' }}>Longitude (Optional)</label>
                                        <input name="lon" className="govuk-input" step="any" type="number" />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="govuk-button">Save</button>
                        </form>
                    </div>
                    <div className="govuk-grid-column-one-half">
                        <h2>Existing Locations</h2>
                        <div>
                            {places.map(p => (
                                <div key={p.id} className="govuk-inset-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ marginTop: 0, marginBottom: '5px', fontSize: '19px' }}>{p.name}</h3>
                                        <span style={{
                                            background: '#f4f8fb',
                                            padding: '2px 8px',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>{p.label}</span>
                                        {(p.lat != 0 || p.lon != 0) && (
                                            <span style={{ marginLeft: '10px', fontSize: '14px', color: '#484949' }}>
                                                {p.lat},{p.lon}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeletePlace(p.id)}
                                        className="govuk-button govuk-button--warning"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LEGS TAB */}
            {activeTab === 'legs' && (
                <div className="govuk-grid-row">
                    <div className="govuk-grid-column-one-half">
                        <h2>Add Leg</h2>
                        <form onSubmit={handleAddLeg}>
                            <div className="govuk-grid-row">
                                <div className="govuk-grid-column-one-half">
                                    <div className="govuk-form-group">
                                        <label className="govuk-label">From</label>
                                        <select
                                            className="govuk-select"
                                            value={legForm.sourceType}
                                            onChange={e => setLegForm({ ...legForm, sourceType: e.target.value })}
                                            style={{ marginBottom: '10px' }}
                                        >
                                            <option value="place">Place</option>
                                            <option value="station">Station</option>
                                        </select>
                                        <select
                                            className="govuk-select"
                                            value={legForm.sourceId}
                                            onChange={e => setLegForm({ ...legForm, sourceId: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {renderOptions(legForm.sourceType || 'place')}
                                        </select>
                                    </div>
                                </div>
                                <div className="govuk-grid-column-one-half">
                                    <div className="govuk-form-group">
                                        <label className="govuk-label">To</label>
                                        <select
                                            className="govuk-select"
                                            value={legForm.destType}
                                            onChange={e => setLegForm({ ...legForm, destType: e.target.value })}
                                            style={{ marginBottom: '10px' }}
                                        >
                                            <option value="station">Station</option>
                                            <option value="place">Place</option>
                                        </select>
                                        <select
                                            className="govuk-select"
                                            value={legForm.destId}
                                            onChange={e => setLegForm({ ...legForm, destId: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {renderOptions(legForm.destType || 'station')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="govuk-grid-row">
                                <div className="govuk-grid-column-one-third" style={{ width: '33.33%', float: 'left', padding: '0 15px' }}>
                                    <div className="govuk-form-group">
                                        <label className="govuk-label">Minutes</label>
                                        <input
                                            type="number"
                                            className="govuk-input"
                                            value={legForm.duration}
                                            onChange={e => setLegForm({ ...legForm, duration: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="govuk-grid-column-one-third" style={{ width: '33.33%', float: 'left', padding: '0 15px' }}>
                                    <div className="govuk-form-group">
                                        <label className="govuk-label">Km</label>
                                        <input
                                            type="number"
                                            className="govuk-input"
                                            value={legForm.distance}
                                            onChange={e => setLegForm({ ...legForm, distance: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="govuk-grid-column-one-third" style={{ width: '33.33%', float: 'left', padding: '0 15px' }}>
                                    <div className="govuk-form-group">
                                        <label className="govuk-label">Ease</label>
                                        <input
                                            type="number"
                                            className="govuk-input"
                                            value={legForm.ease}
                                            onChange={e => setLegForm({ ...legForm, ease: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="govuk-button" style={{ clear: 'both' }}>Save Leg</button>
                        </form>
                    </div>
                    <div className="govuk-grid-column-one-half">
                        <h2>Routes</h2>
                        <div>
                            {legs.map(l => (
                                <div key={l.id} className="govuk-inset-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '16px' }}>
                                        <span style={{ fontWeight: 700 }}>{l.source_name}</span>
                                        <span style={{ color: '#484949' }}>to</span>
                                        <span style={{ fontWeight: 700 }}>{l.dest_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: '16px' }}>{l.duration_mins}m</span>
                                        <button
                                            onClick={() => handleDeleteLeg(l.id)}
                                            className="govuk-button govuk-button--warning"
                                            style={{ marginBottom: 0, padding: '5px 10px' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaceManager;
