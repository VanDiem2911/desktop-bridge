import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT id, name, nodes FROM workflow_entity')
rows = cur.fetchall()
for id, name, nodes_json in rows:
    if 'Viết bài' in name or 'viet bai' in name.lower():
        print(f"ID: {id} | Name: {name}")
        nodes = json.loads(nodes_json)
        for n in nodes:
            if 'Agent 2' in n.get('name', '') or 'Model' in n.get('type', ''):
                print(f"  Node: {n.get('name')} | Type: {n.get('type')}")
                params = n.get('parameters', {})
                print("  Params:", json.dumps(params, ensure_ascii=False))
