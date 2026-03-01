import psycopg2
import os

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "commuter")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")

# Station ID Mapping
STATION_MAPPING = {
    "Koyambedu": 210, "CMBT": 211, "Arumbakkam": 212, "Vadapalani": 213, 
    "Ashok Nagar": 214, "Ekkattuthangal": 215, "Alandur": 114, "Airport": 117, 
    "Meenambakkam": 116, "Nanganallur Road": 115, "Guindy": 113, "Little Mount": 112, 
    "St. Thomas Mount": 217, "Thirumangalam": 209, "Anna Nagar Tower": 208, 
    "Anna Nagar East": 207, "Shenoy Nagar": 206, "Pachaiyappa's College": 205, 
    "Kilpauk": 204, "Nehru Park": 203, "Egmore": 202, "Chennai Central": 104, 
    "AG-DMS": 108, "Teynampet": 109, "Nandanam": 110, "Saidapet": 111, 
    "Thousand Lights": 107, "LIC": 106, "Government Estate": 105, "High Court": 103, 
    "Mannadi": 102, "Washermenpet": 101, "Theagaraya College": 149, "Tondiarpet": 148,
    "New Washermenpet": 147, "Tollgate": 146, "Kaladipet": 145, "Tiruvottiyur": 143,
    "Wimco Nagar": 142, "Tiruvottiyur Theradi": 144, "Wimco Nagar Depot": 141
}

# Parking Code Mapping
PARKING_CODES = {
    "Wimco Nagar Depot": "SWD", "Wimco Nagar": "SWN", "Tiruvottiyur": "STV", 
    "Tiruvottiyur Theradi": "STT", "Kaladipet": "SKP", "Tollgate": "STG", 
    "New Washermenpet": "SNW", "Tondiarpet": "STR", "Theagaraya College": "STC", 
    "Washermenpet": "SWA", "Mannadi": "SMA", "High Court": "SHC", 
    "Government Estate": "SGE", "LIC": "SLI", "Thousand Lights": "STL", 
    "AG-DMS": "SGM", "Teynampet": "STE", "Nandanam": "SCR", "Saidapet": "SSA", 
    "Little Mount": "SLM", "Guindy": "SGU", "Nanganallur Road": "SOT", 
    "Meenambakkam": "SME", "Airport": "SAP", "Chennai Central": "SCC", 
    "Egmore": "SEG", "Nehru Park": "SNP", "Kilpauk": "SKM", 
    "Pachaiyappa's College": "SPC", "Shenoy Nagar": "SSN", "Anna Nagar East": "SAE", 
    "Anna Nagar Tower": "SAT", "Thirumangalam": "STI", "Koyambedu": "SKO", 
    "Arumbakkam": "SAR", "Vadapalani": "SVA", "Ashok Nagar": "SAN", 
    "Ekkattuthangal": "SSI", "Alandur": "SAL", "St. Thomas Mount": "SMM", "CMBT": "CMBT"
}

def seed():
    try:
        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user="pranavsathyaar") 
        # Changed user to owner if postgres role implies auth issues locally
    except:
        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME) # Try default

    cur = conn.cursor()
    
    print("Seeding stations...")
    for name, sid in STATION_MAPPING.items():
        code = PARKING_CODES.get(name)
        # Try to match fuzzy names
        if not code:
            if name == "CMBT": code = "CMBT" # Explicit map check
        
        # Insert
        try:
            cur.execute("""
                INSERT INTO stations (station_id, name, code) 
                VALUES (%s, %s, %s)
                ON CONFLICT (station_id) DO UPDATE SET code = EXCLUDED.code;
            """, (sid, name, code))
        except Exception as e:
            print(f"Error inserting {name}: {e}")
            conn.rollback()
            continue
            
    conn.commit()
    print("Seeding Done.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
