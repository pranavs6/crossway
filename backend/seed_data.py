import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "commuter")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")

blue_stations = [
    {"name":"Chennai International Airport","lat":12.980826,"lon":80.1642,"id":117},
    {"name":"Meenambakkam","lat":12.987656,"lon":80.176505,"id":116},
    {"name":"Nanganallur Road","lat":12.999933,"lon":80.193985,"id":115},
    {"name":"Alandur","lat":13.004713,"lon":80.20145,"id":114},
    {"name":"Guindy","lat":13.00924,"lon":80.213199,"id":113},
    {"name":"Little Mount","lat":13.014712,"lon":80.223993,"id":112},
    {"name":"Saidapet","lat":13.023717,"lon":80.228208,"id":111},
    {"name":"Nandanam","lat":13.03139,"lon":80.239969,"id":110},
    {"name":"Teynampet","lat":13.037904,"lon":80.247029,"id":109},
    {"name":"AG-DMS","lat":13.044682,"lon":80.248052,"id":108},
    {"name":"Thousand Lights","lat":13.058198,"lon":80.258056,"id":107},
    {"name":"LIC","lat":13.064511,"lon":80.266065,"id":106},
    {"name":"Government Estate","lat":13.069557,"lon":80.272842,"id":105},
    {"name":"Chennai Central","lat":13.081426,"lon":80.272887,"id":104},
    {"name":"High Court","lat":13.087369,"lon":80.285021,"id":103},
    {"name":"Mannadi","lat":13.095177,"lon":80.286164,"id":102},
    {"name":"Washermenpet","lat":13.107064,"lon":80.280528,"id":101},
    {"name":"Theagaraya College","lat":13.116,"lon":80.284,"id":149},
    {"name":"Tondiarpet","lat":13.124,"lon":80.289,"id":148},
    {"name":"New Washermenpet","lat":13.13498,"lon":80.29327,"id":147},
    {"name":"Tollgate","lat":13.143,"lon":80.296,"id":146},
    {"name":"Kaladipet","lat":13.151,"lon":80.299,"id":145},
    {"name":"Tiruvottiyur Theradi","lat":13.15977258,"lon":80.30244886,"id":144},
    {"name":"Tiruvottiyur","lat":13.172,"lon":80.305,"id":143},
    {"name":"Wimco Nagar","lat":13.17915,"lon":80.30767,"id":142},
    {"name":"Wimco Nagar Depot","lat":13.1842985,"lon":80.30909273,"id":141}
]

green_stations = [
    {"name":"Egmore","lat":13.079059,"lon":80.261098,"id":202},
    {"name":"Nehru Park","lat":13.078625,"lon":80.250855,"id":203},
    {"name":"Kilpauk","lat":13.077508,"lon":80.242867,"id":204},
    {"name":"Pachaiyappa's College","lat":13.07557,"lon":80.232347,"id":205},
    {"name":"Shenoy Nagar","lat":13.078697,"lon":80.225133,"id":206},
    {"name":"Anna Nagar East","lat":13.084794,"lon":80.21866,"id":207},
    {"name":"Anna Nagar Tower","lat":13.084975,"lon":80.208727,"id":208},
    {"name":"Thirumangalam","lat":13.085259,"lon":80.201575,"id":209},
    {"name":"Koyambedu","lat":13.073708,"lon":80.194869,"id":210},
    {"name":"CMBT","lat":13.068568,"lon":80.203882,"id":211},
    {"name":"Arumbakkam","lat":13.062058,"lon":80.211581,"id":212},
    {"name":"Vadapalani","lat":13.050825,"lon":80.212242,"id":213},
    {"name":"Ashok Nagar","lat":13.035534,"lon":80.21114,"id":214},
    {"name":"Ekkattuthangal","lat":13.017044,"lon":80.20594,"id":215},
    {"name":"St. Thomas Mount","lat":12.995128,"lon":80.19864,"id":217}
]

def ensure_unique(cur):
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'stations_station_id_key'
            ) THEN
                ALTER TABLE stations
                ADD CONSTRAINT stations_station_id_key
                UNIQUE (station_id);
            END IF;
        END$$;
    """)

def upsert(cur, stations, line):
    cur.executemany("""
        INSERT INTO stations (station_id, name, lat, lon, code, line)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (station_id)
        DO UPDATE SET
            name = EXCLUDED.name,
            lat  = EXCLUDED.lat,
            lon  = EXCLUDED.lon,
            code = EXCLUDED.code,
            line = EXCLUDED.line;
    """, [
        (s["id"], s["name"], s["lat"], s["lon"], str(s["id"]), line)
        for s in stations
    ])

def seed():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    cur = conn.cursor()

    ensure_unique(cur)
    upsert(cur, blue_stations, "Blue")
    upsert(cur, green_stations, "Green")

    conn.commit()
    conn.close()
    print("Metro stations upserted.")

if __name__ == "__main__":
    seed()
