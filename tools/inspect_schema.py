import sqlite3, os
db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('PRAGMA table_info(execution_entity)')
print([col[1] for col in cur.fetchall()])
try:
    cur.execute('PRAGMA table_info(execution_data)')
    print("execution_data:", [col[1] for col in cur.fetchall()])
except: pass
