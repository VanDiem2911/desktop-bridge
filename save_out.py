import json

with open('d:/HUDI/n8n/exec_dump.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

resultData = d.get('resultData', {})
if isinstance(resultData, str):
    resultData = json.loads(resultData)

runData = resultData.get('runData', {})
for k, v in runData.items():
    if 'Agent 2' in k:
        out = v[0]['data']['main'][0][0]['json']['output']
        with open('d:/HUDI/n8n/agent2_raw_output.txt', 'w', encoding='utf-8') as f_out:
            f_out.write(out)
        print(f"Agent 2 output written! Length: {len(out)}")
        print("--- START ---")
        print(out[:300])
        print("--- END ---")
        print(out[-300:])
