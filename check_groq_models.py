import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT nodes FROM workflow_entity WHERE id = "0T5wI4ZQSYbgMg8d"')
row = cur.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        if 'Groq' in n.get('name', '') or 'lmChatGroq' in n.get('type', ''):
            print(n.get('name'), "=>", n.get('parameters', {}).get('model'))
