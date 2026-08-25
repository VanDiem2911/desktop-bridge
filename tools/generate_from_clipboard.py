import subprocess
import json
import sys
import os
from generate_docx import create_docx

def get_clipboard_text():
    # Use PowerShell to get clipboard text
    res = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Clipboard"], capture_output=True, text=True, encoding="utf-8")
    return res.stdout.strip()

if __name__ == "__main__":
    text = get_clipboard_text()
    if not text:
        print("[Error] Clipboard is empty.")
        sys.exit(1)

    try:
        data = json.loads(text)
    except Exception as e:
        print(f"[Error] Clipboard content is not valid JSON: {e}")
        sys.exit(1)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_docx = os.path.join(base_dir, "Danh_sach_151_nhom_Facebook.docx")
    create_docx(data, output_docx)
    
    print(f"[SUCCESS] Da tao thanh cong: {output_docx}")
    os.system(f'explorer.exe /select,"{output_docx}"')
