import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-fit bounds
function AutoFitBounds({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [bounds, map]);
    return null;
}

const CommuteMap = ({ activeJourney }) => {
    const [dynamicRoute, setDynamicRoute] = useState([]);

    useEffect(() => {
        if (activeJourney && activeJourney.coords) {
            fetchRoute();
        }
    }, [activeJourney]);

    const fetchRoute = async () => {
        if (!activeJourney || !activeJourney.coords) return;

        const { home, src_station } = activeJourney.coords;

        // Fetch only Home to Station route
        if (Math.abs(home[0]) > 0.1 && Math.abs(src_station[0]) > 0.1) {
            try {
                const res = await fetch(`http://localhost:5001/api/polyline?start=${home[0]},${home[1]}&end=${src_station[0]},${src_station[1]}&mode=foot`);
                if (res.ok) {
                    const data = await res.json();
                    setDynamicRoute(data);
                }
            } catch (e) {
                console.error('Route fetch error:', e);
            }
        }
    };

    if (!activeJourney || !activeJourney.coords) {
        return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f8fb' }}>
            <p>No journey selected</p>
        </div>;
    }

    const { home, src_station, dest_station, work } = activeJourney.coords;

    // Calculate bounds based on all points in this journey
    const allPoints = [home, src_station, dest_station, work].filter(p => p && Math.abs(p[0]) > 0.1);

    // Metro line (simplified for this journey)
    const metroLine = [src_station, dest_station].filter(p => p && Math.abs(p[0]) > 0.1);

    return (
        <MapContainer
            center={home || [13.0827, 80.2707]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* Dynamic walking route (Home to Station) */}
            {dynamicRoute.length > 0 && (
                <Polyline positions={dynamicRoute} color="#0b0c0c" weight={3} dashArray="5, 5" />
            )}

            {/* Metro route */}
            {metroLine.length === 2 && (
                <Polyline positions={metroLine} color="#1d70b8" weight={4} />
            )}

            {/* Markers */}
            {home && Math.abs(home[0]) > 0.1 && (
                <Marker position={home}>
                    <Popup>Home</Popup>
                </Marker>
            )}
            {src_station && Math.abs(src_station[0]) > 0.1 && (
                <Marker position={src_station}>
                    <Popup>{activeJourney.source_station}</Popup>
                </Marker>
            )}
            {dest_station && Math.abs(dest_station[0]) > 0.1 && (
                <Marker position={dest_station}>
                    <Popup>{activeJourney.dest_station}</Popup>
                </Marker>
            )}
            {work && Math.abs(work[0]) > 0.1 && (
                <Marker position={work}>
                    <Popup>Work</Popup>
                </Marker>
            )}

            {/* Auto-fit bounds to this journey's points */}
            <AutoFitBounds bounds={allPoints} />
        </MapContainer>
    );
};

export default CommuteMap;
