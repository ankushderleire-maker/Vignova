
import sys

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
for i, line in enumerate(lines):
    if '{/* --- RESULT STEP --- */}' in line:
        start_idx = i
        break

if start_idx != -1:
    with open("result_part.txt", "w", encoding="utf-8") as f:
        f.writelines(lines[start_idx:])

