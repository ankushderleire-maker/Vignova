
import re

file_path = "app/dashboard/ats-score/page.tsx.bak"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Remove activeSection
text = re.sub(r'[ \t]*const \[activeSection, setActiveSection\] = useState\("overview"\);\n', '', text)

# Find the start of the result block content (after the inline style for animations)
result_start = text.find('<div className="flex gap-6">')
if result_start == -1:
    print("Could not find start of result block")
    exit(1)

# Find the start of the loading step (which comes after the result block)
loading_start = text.find('{/* --- LOADING STEP --- */}')
if loading_start == -1:
    print("Could not find loading step")
    exit(1)

# We want to replace everything from result_start up to the closing tags of the result block.
# Looking at the structure:
#             {/* --- RESULT STEP --- */}
#             {
#                 step === "result" && result && (
#                     <div>
#                         <style>...</style>
#                         <div className="flex gap-6"> 
#                              ... 
#                         </div>
#                     </div>
#                 )
#             }
# 
#             {/* --- LOADING STEP --- */}
# So between result_start and loading_start, there should be `</div>\n</div>\n)\n}`

# Let's just use regex to capture the `flex gap-6` div and everything in it until the closing of `step === "result"`.
# The easiest way is to find the exact closing bracket before `LOADING STEP`.
closing_index = text.rfind('}\n\n            {/* --- LOADING STEP --- */}', 0, loading_start + 50)
if closing_index == -1:
    # try another format
    closing_index = text.rfind('}\n            {/* --- LOADING STEP --- */}', 0, loading_start + 50)
    if closing_index == -1:
        # Just find the `</div>\n                    </div>\n                )\n            }` before loading_start
        pass

# Let's just replace the `flex gap-6` with the new layout, keeping the outer div.
end_of_flex_gap_6 = text.rfind('</div>', result_start, loading_start) 
# wait, there are many divs.

