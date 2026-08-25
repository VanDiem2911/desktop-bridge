import sqlite3, json, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1')
row = cur.fetchone()
if row:
    exec_id, data_str = row
    data = json.loads(data_str)
    if isinstance(data, str):
        data = json.loads(data)
    resultData = data.get('resultData', {})
    runData = resultData.get('runData', {})
    for k, v in runData.items():
        if 'Agent 2' in k:
            out = v[0]['data']['main'][0][0]['json']['output']
            with open('d:/HUDI/n8n/agent2_raw_output.txt', 'w', encoding='utf-8') as f:
                f.write(out)
            print(f"Saved {len(out)} chars to d:/HUDI/n8n/agent2_raw_output.txt")
