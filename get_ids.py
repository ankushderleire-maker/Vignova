import re
with open(r'h:\Ankush\RESUME PRO\FULL DEPLOYING CODE\Browser_Extension\popup\popup.js', 'r', encoding='utf-8') as f:
    content = f.read()
ids = re.findall(r'getElementById\([\'\"](.*?)[\'\"]\)', content)
print(sorted(list(set(ids))))
