import json

with open('d:/HUDI/n8n/exec_dump.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

for idx, item in enumerate(items):
    if isinstance(item, str) and ('<think>' in item or '"calendar"' in item):
        print(f"Found at index {idx}, length: {len(item)}")
        with open('d:/HUDI/n8n/agent2_raw_output.txt', 'w', encoding='utf-8') as f_out:
            f_out.write(item)
        print("Written to d:/HUDI/n8n/agent2_raw_output.txt")
        break
