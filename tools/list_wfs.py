import sqlite3
import json
import os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT id, name FROM workflow_entity')
rows = cur.fetchall()
for r in rows:
    print(r)
