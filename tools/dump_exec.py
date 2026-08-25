import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1')
row = cur.fetchone()
if row:
    exec_id, data_str = row
    data = json.loads(data_str)
    print("Type of data:", type(data))
    if isinstance(data, list):
        print("List length:", len(data))
        print("Item 0 type:", type(data[0]))
        if isinstance(data[0], dict):
            print("Item 0 keys:", list(data[0].keys()))
            with open('d:/HUDI/n8n/exec_dump.json', 'w', encoding='utf-8') as f:
                json.dump(data[0], f, indent=2, ensure_ascii=False)
