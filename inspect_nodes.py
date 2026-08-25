import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT id, name, nodes, connections FROM workflow_entity WHERE id = "0T5wI4ZQSYbgMg8d"')
row = cur.fetchone()
if row:
    id, name, nodes_json, conn_json = row
    nodes = json.loads(nodes_json)
    for n in nodes:
        print(f"Node: {n.get('name')} | Type: {n.get('type')}")
        if 'Model' in n.get('type', '') or 'Agent 2' in n.get('name', ''):
            print("  Parameters:", json.dumps(n.get('parameters', {})))
