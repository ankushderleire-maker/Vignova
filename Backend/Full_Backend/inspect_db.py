import os
import sys
import json
sys.path.append(os.getcwd())
from app.db_pool import get_db_connection

with get_db_connection() as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT "rawProfileData" FROM "LinkedInAnalysis" ORDER BY "createdAt" DESC LIMIT 1')
        row = cur.fetchone()
        if row:
            print(json.dumps(row[0], indent=2))
        else:
            print("No records found")
