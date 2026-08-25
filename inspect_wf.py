import sqlite3
import json
import os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT name, nodes FROM workflow_entity WHERE id = ?', ('hl8rqtHtLhqvpmcSW',))
row = cur.fetchone()
if row:
    name, nodes_json = row
    print("Workflow Name:", name)
    nodes = json.loads(nodes_json)
    for n in nodes:
        if 'Agent 2' in n.get('name', '') or 'Model' in n.get('type', ''):
            print("---------------------------------------------")
            print("Node Name:", n.get('name'))
            print("Type:", n.get('type'))
            print("Parameters:", json.dumps(n.get('parameters', {}), ensure_ascii=False, indent=2))
