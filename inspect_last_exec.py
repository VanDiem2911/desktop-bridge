import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT id, data FROM execution_entity ORDER BY id DESC LIMIT 1')
row = cur.fetchone()
if row:
    exec_id, data_str = row
    print("Execution ID:", exec_id)
    # The execution data is compressed or json
    try:
        data = json.loads(data_str)
        exec_data = data.get('resultData', {}).get('runData', {})
        for node_name, runs in exec_data.items():
            if 'Agent 2' in node_name:
                print(f"Node {node_name} runs:")
                for r in runs:
                    print("Output:", json.dumps(r.get('data', {}).get('main', [[]])[0], ensure_ascii=False)[:1000])
    except Exception as e:
        print("Error parsing execution:", e)
