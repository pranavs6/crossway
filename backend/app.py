import os
import requests
import datetime
import re
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "commuter")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
OSRM_URL = os.getenv("OSRM_URL", "http://localhost:5000")
CMRL_BASE_URL = os.getenv("CMRL_APP_URL", "https://travelplanner.chennaimetrorail.org")
CMRL_PARKING_URL = os.getenv("CMRL_PARKING_URL", "https://chennaimetrorail.org/wp-content/themes/chennaimetro/parking-status.php")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to store the dynamic secret key
CMRL_SECRET = "$GrtJWlry#StH#QRit$kY"

# In-memory cache for last computed journeys
journey_cache = {
    "data": [],
    "updated_at": None
}

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)

def fetch_secret_key():
    global CMRL_SECRET
    try:
        logger.info("Fetching dynamic secret key from CMRL script...")
        target_url = "https://travelplanner.chennaimetrorail.org/script.js"
        res = requests.get(target_url, timeout=5)
        if res.status_code == 200:
            match = re.search(r'["\']?SecretKey["\']?\s*:\s*["\']([^"\']+)["\']', res.text)
            if match:
                CMRL_SECRET = match.group(1)
                logger.info(f"Secret Key Extracted: {CMRL_SECRET[:5]}...")
            else:
                logger.warning("Secret Key regex failed, using default.")
        else:
            logger.warning(f"Failed to fetch script.js: {res.status_code}")
    except Exception as e:
        logger.error(f"Error fetching secret key: {e}")

# Fetch key on startup
fetch_secret_key()

@app.route('/api/stations', methods=['GET', 'PUT'])
def manage_stations():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if request.method == 'GET':
        cur.execute("SELECT * FROM stations ORDER BY name")
        stations = cur.fetchall()
        conn.close()
        return jsonify(stations)
    elif request.method == 'PUT':
        data = request.json
        cur.execute("UPDATE stations SET is_source = %s, is_destination = %s WHERE id = %s",
                   (data.get('is_source', False), data.get('is_destination', False), data['id']))
        conn.commit()
        conn.close()
        return jsonify({"status": "success"})

@app.route('/api/places', methods=['GET', 'POST', 'DELETE'])
def manage_places():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if request.method == 'GET':
        cur.execute("SELECT * FROM places ORDER BY label, name")
        places = cur.fetchall()
        conn.close()
        return jsonify(places)
    elif request.method == 'POST':
        data = request.json
        cur.execute("INSERT INTO places (name, label, address, lat, lon) VALUES (%s, %s, %s, %s, %s)",
                   (data['name'], data['label'], data.get('address'), data.get('lat', 0), data.get('lon', 0)))
        conn.commit()
        conn.close()
        return jsonify({"status": "created"})
    elif request.method == 'DELETE':
        place_id = request.view_args.get('id') # Handled by route param usually
        pass 
    
@app.route('/api/places/<int:id>', methods=['DELETE'])
def delete_place(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM places WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})

@app.route('/api/legs', methods=['GET', 'POST', 'DELETE'])
def manage_legs():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if request.method == 'GET':
        cur.execute("""
            SELECT l.*, 
                CASE WHEN l.source_type='station' THEN s1.name ELSE p1.name END as source_name,
                CASE WHEN l.dest_type='station' THEN s2.name ELSE p2.name END as dest_name
            FROM journey_legs l
            LEFT JOIN stations s1 ON l.source_id = s1.id AND l.source_type='station'
            LEFT JOIN places p1 ON l.source_id = p1.id AND l.source_type='place'
            LEFT JOIN stations s2 ON l.dest_id = s2.id AND l.dest_type='station'
            LEFT JOIN places p2 ON l.dest_id = p2.id AND l.dest_type='place'
        """)
        legs = cur.fetchall()
        conn.close()
        return jsonify(legs)
    elif request.method == 'POST':
        data = request.json
        cur.execute("INSERT INTO journey_legs (source_type, source_id, dest_type, dest_id, distance_km, duration_mins, ease_rating) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                   (data['source_type'], data['source_id'], data['dest_type'], data['dest_id'], data['distance_km'], data['duration_mins'], data['ease_rating']))
        conn.commit()
        conn.close()
        return jsonify({"status": "created"})
    elif request.method == 'DELETE':
        leg_id = request.args.get('id')
        cur.execute("DELETE FROM journey_legs WHERE id = %s", (leg_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "deleted"})

# OSRM Polyline Proxy
@app.route('/api/polyline', methods=['GET'])
def get_osrm_polyline():
    start_coords = request.args.get('start') # lat,lon
    end_coords = request.args.get('end')     # lat,lon
    mode = request.args.get('mode', 'foot')

    if not start_coords or not end_coords:
        return jsonify([])

    # Cache key
    cache_key = f"{start_coords}-{end_coords}-{mode}"
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT geometry FROM polylines WHERE key = %s", (cache_key,))
    row = cur.fetchone()
    
    if row:
        conn.close()
        return jsonify(json.loads(row[0]))

    # Fetch from OSRM
    try:
        slat, slon = start_coords.split(',')
        elat, elon = end_coords.split(',')
        # OSRM expects lon,lat
        url = f"{OSRM_URL}/route/v1/{mode}/{slon},{slat};{elon},{elat}?overview=full&geometries=geojson"
        res = requests.get(url, timeout=2)
        if res.status_code == 200:
            data = res.json()
            if data['routes']:
                geometry = data['routes'][0]['geometry']['coordinates'] # [[lon, lat], ...]
                # Convert to [[lat, lon], ...] for Leaflet
                leaflet_geometry = [[p[1], p[0]] for p in geometry]
                
                # Save to DB
                json_geom = json.dumps(leaflet_geometry)
                cur.execute("INSERT INTO polylines (key, geometry) VALUES (%s, %s) ON CONFLICT (key) DO NOTHING", (cache_key, json_geom))
                conn.commit()
                conn.close()
                return jsonify(leaflet_geometry)
    except Exception as e:
        logger.error(f"OSRM Error: {e}")

    conn.close()
    return jsonify([]) # Fallback

def fetch_trip(src_id, dest_id, timestamp):
    # Retrieve dynamic secret first if needed or use global
    url = "https://apiprod.chennaimetrorail.org/v4/api/TravelPlannerWithRoute/TravelPlanner"
    payload = {
        "FromStationId": str(src_id),
        "ToStationCode": str(dest_id),
        "strDate": timestamp.strftime("%Y-%m-%d"),
        "strTime": timestamp.strftime("%H:%M"),
        "SecretKey": CMRL_SECRET
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        logger.error(f"CMRL API Error: {e}")
    return None

PARKING_CACHE = {
    "data": None,
    "last_fetched": None
}

def get_parking_data():
    global PARKING_CACHE
    url = "https://commuters-dataapi.chennaimetrorail.org/api/ParkingArea/getParkingAreaAvailability"
    
    # 5 min cache
    if PARKING_CACHE['data'] and PARKING_CACHE['last_fetched'] and \
       (datetime.datetime.now() - PARKING_CACHE['last_fetched']).seconds < 300:
        return PARKING_CACHE['data']
        
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            PARKING_CACHE['data'] = data
            PARKING_CACHE['last_fetched'] = datetime.datetime.now()
            return data
    except Exception as e:
        logger.error(f"Parking API Error: {e}")
        return PARKING_CACHE['data'] or [] # Return stale or empty
    return []

def fetch_parking_availability(station_name=None):
    if not station_name: return None
    
    all_data = get_parking_data()
    if not all_data: return None
    
    # Aggregate data for the station (handling multiple areas like P1, P2)
    stats = {
        "two_wheeler": {"available": 0, "total": 0},
        "four_wheeler": {"available": 0, "total": 0}
    }
    
    found = False
    
    # normalize check
    target = station_name.lower().replace('.', '').replace(' metro', '').strip()
    
    for area in all_data:
        # API Name: "Arignar Anna Alandur " -> "arignar anna alandur"
        api_name = area.get('stationName', '').lower().replace('.', '').replace(' metro', '').strip()
        
        # Simple substring match
        if target in api_name or api_name in target or (target == "alandur" and "alandur" in api_name):
            found = True
            stats["two_wheeler"]["available"] += area.get('twoWheelerAvailable', 0)
            stats["two_wheeler"]["total"] += area.get('twoWheelerCapacity', 0)
            stats["four_wheeler"]["available"] += area.get('threeNFourWheelerAvailable', 0) 
            # Note: API has threeNFourWheelerAvailable. Assuming this maps to cars.
            stats["four_wheeler"]["total"] += area.get('threeNFourWheelerCapacity', 0)
            
    return stats if found else None

@app.route('/api/journeys/calculate', methods=['POST'])
def calculate_journeys():
    global journey_cache
    
    req_data = request.json or {}
    
    # If requesting cached data
    if req_data.get('use_cache') and journey_cache['data']:
        return jsonify(journey_cache['data'])
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get config (Home -> Station Leg)
    cur.execute("SELECT * FROM stations WHERE is_source = TRUE")
    sources = cur.fetchall()
    cur.execute("SELECT * FROM stations WHERE is_destination = TRUE")
    dests = cur.fetchall()
    
    # Get legs (Home -> Station)
    cur.execute("""
        SELECT l.*, p.lat as p_lat, p.lon as p_lon, 
               s.lat as s_lat, s.lon as s_lon 
        FROM journey_legs l 
        JOIN places p ON l.source_id = p.id 
        JOIN stations s ON l.dest_id = s.id 
        WHERE l.source_type='place' AND l.dest_type='station'
    """)
    legs_to_station = cur.fetchall()

    journeys = []
    
    now = datetime.datetime.now()
    if req_data.get('start_time'):
        now = datetime.datetime.strptime(req_data['start_time'], "%Y-%m-%dT%H:%M")

    for leg in legs_to_station:
        # leg has distance, duration, ease
        # find corresponding source station
        src_station = next((s for s in sources if s['id'] == leg['dest_id']), None)
        if not src_station: continue
        
        # Fetch Parking Availability for Source Station
        parking_data = fetch_parking_availability(src_station['name'])

        for dst_station in dests:
            # Plan: Home -(leg)-> SrcStation -(metro)-> DstStation -(walk)-> Work
            
            # 1. Calculate ideal arrival at station (now + leg duration)
            arrive_at_station = now + datetime.timedelta(minutes=leg['duration_mins'] + 3) # +3 buffer (was 5)
            
            # 2. Fetch Metro trips from this time
            trip_data = fetch_trip(src_station['station_id'], dst_station['station_id'], arrive_at_station)
            
            if trip_data and trip_data.get('status') == 'success':
                timetable = trip_data.get('timetable', [])
                
                next_trains = []
                # Timetable has 'train_time' (HH:MM:SS)
                for train in timetable:
                    t_dep_str = train['train_time']
                    try: t_dep_dt = datetime.datetime.strptime(f"{now.strftime('%Y-%m-%d')} {t_dep_str}", "%Y-%m-%d %H:%M:%S")
                    except: t_dep_dt = datetime.datetime.strptime(f"{now.strftime('%Y-%m-%d')} {t_dep_str}", "%Y-%m-%d %H:%M")
                    
                    # Logic to handle midnight crossing vs missed train
                    arrival_thresh = arrive_at_station
                    
                    if t_dep_dt < arrival_thresh:
                        # Check variance. If only missed by < 30 mins, assume same day missed.
                        diff = (arrival_thresh - t_dep_dt).total_seconds() / 60
                        if diff < 120: 
                             continue # Missed this train
                        else:
                             # Likely next day (e.g. now=23:50, train=00:10)
                             t_dep_dt += datetime.timedelta(days=1)
                    
                    # Check for transfer and split times
                    transfer_station = None
                    transfer_arr = None
                    transfer_dep = None
                    
                    metro_duration = int(trip_data.get('duration', 0))
                    
                    if train.get('route'):
                        stops = train['route']
                        total_stops = len(stops)
                        transfer_idx = -1
                        
                        for idx, stop in enumerate(stops):
                            if stop.get('linecolor') == 'Intermediate':
                                raw_name = stop.get('stationname', '')
                                # Clean up name
                                if "Alandur" in raw_name: transfer_station = "Alandur"
                                elif "Central" in raw_name: transfer_station = "Central"
                                else: transfer_station = raw_name
                                transfer_idx = idx
                                break
                        
                        if transfer_station and transfer_idx > 0:
                            # Estimate time to transfer station (Proportional to stops)
                            # Assume 5 min transfer penalty added to TOTAL time for user reality
                            # But trip_data['duration'] is likely just travel time.
                            
                            ratio = transfer_idx / (total_stops - 1)
                            time_to_transfer = int(metro_duration * ratio)
                            
                            t_transfer_arr = t_dep_dt + datetime.timedelta(minutes=time_to_transfer)
                            t_transfer_dep = t_transfer_arr + datetime.timedelta(minutes=5) # 5 min buffer to change lines
                            
                            transfer_arr = t_transfer_arr.strftime("%H:%M")
                            transfer_dep = t_transfer_dep.strftime("%H:%M")
                            
                            # Update total duration to include the transfer wait
                            metro_duration += 5 
                    
                    # Add walk from station to work
                    walk_duration = 8 
                    
                    t_arrive_dt = t_dep_dt + datetime.timedelta(minutes=metro_duration)
                    t_reach_work = t_arrive_dt + datetime.timedelta(minutes=walk_duration)
                    
                    # Calculate Leave Home Time
                    # Train Dep - Buffer(3) - Drive(leg)
                    t_leave_home = t_dep_dt - datetime.timedelta(minutes=3 + leg['duration_mins'])
                    
                    # Optimization Score (Total Time)
                    total_duration = (t_reach_work - t_leave_home).total_seconds() / 60
                    
                    train_entry = {
                        "timings": {
                            "leave_home": t_leave_home.strftime("%H:%M"),
                            "reach_station": (t_leave_home + datetime.timedelta(minutes=leg['duration_mins'])).strftime("%H:%M"),
                            "train_departs": t_dep_dt.strftime("%H:%M"),
                            "train_arrives": t_arrive_dt.strftime("%H:%M"),
                            "reach_work": t_reach_work.strftime("%H:%M"),
                            "transfer_arr": transfer_arr,
                            "transfer_dep": transfer_dep
                        },
                        "durations": {
                            "drive": leg['duration_mins'],
                            "wait": 3, # buffer
                            "metro": metro_duration,
                            "walk": walk_duration,
                            "total": int(total_duration)
                        },
                        "source_station": src_station['name'],
                        "dest_station": dst_station['name'],
                        "transfer_station": transfer_station,
                        "parking": parking_data,
                        "is_optimized": False,
                        # Coordinates context for Map
                        "coords": {
                            "home": [leg['p_lat'], leg['p_lon']],
                            "src_station": [src_station.get('lat', 0), src_station.get('lon', 0)],
                            "dest_station": [dst_station.get('lat', 0), dst_station.get('lon', 0)],
                            "work": [13.040, 80.250] 
                        }
                    }
                    next_trains.append(train_entry)
                
                # Sort by arrival at work
                next_trains.sort(key=lambda x: x['timings']['reach_work'])
                
                # Pick valid ones (leave time > now check? handled by list)
                valid_options = [t for t in next_trains if t['timings']['leave_home'] >= now.strftime("%H:%M") or req_data.get('start_time')]
                
                if next_trains:
                    # Mark best one
                    best = next_trains[0]
                    best['is_optimized'] = True
                    
                    journeys.append({
                        "primary": best,
                        "next_departures": next_trains[1:5]
                    })

    conn.close()
    
    # Update cache with new results
    journey_cache['data'] = journeys
    journey_cache['updated_at'] = datetime.datetime.now().isoformat()
    
    return jsonify(journeys)

if __name__ == '__main__':
    app.run(port=5001, debug=True)
