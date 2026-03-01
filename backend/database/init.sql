CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    line VARCHAR(50), -- 'Blue' or 'Green'
    is_source BOOLEAN DEFAULT FALSE,
    is_destination BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    label VARCHAR(50), -- 'home', 'work'
    address TEXT,
    lat DOUBLE PRECISION DEFAULT 0,
    lon DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS journey_legs (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(20), -- 'place' or 'station'
    source_id INTEGER,
    dest_type VARCHAR(20),
    dest_id INTEGER,
    distance_km FLOAT,
    duration_mins INTEGER,
    ease_rating INTEGER, -- 1-5
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS polylines (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL, -- e.g. "lat1,lon1-lat2,lon2-mode"
    geometry TEXT NOT NULL, -- The encoded polyline string or JSON
    distance_meters FLOAT,
    duration_seconds FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
