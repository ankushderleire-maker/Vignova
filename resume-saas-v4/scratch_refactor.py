import re
import sys

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove sidebar and mobile tabs block
sidebar_start = '<div className="flex-1 min-h-0 flex gap-4">'
content_area_start = '{/* -- Content Area -- */}'
content_area_end = '<div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-2">'

# Find indices
idx_start = content.find(sidebar_start)
idx_mid = content.find(content_area_start, idx_start)
idx_end = content.find(content_area_end, idx_mid) + len(content_area_end)

if idx_start == -1 or idx_end == -1:
    print("Could not find sidebar block to replace.")
    sys.exit(1)

new_content_area = """<div className="flex-1 min-h-0 flex flex-col items-center">
                            {/* -- Content Area (Single Page) -- */}
                            <div className="w-full max-w-5xl overflow-y-auto custom-scrollbar pr-2 space-y-12 pb-12">"""

# Replace sidebar and content start
content = content[:idx_start] + new_content_area + content[idx_end:]

# 2. Remove all `{activeSection === "..." && (<>` and `</>)}` or similar
# The tags we need to remove are:
# {activeSection === "overview" && (<>
# </>)}
# {activeSection === "keywords" && (
# )}
# {activeSection === "sections" && (
# )}
# {activeSection === "improvements" && (<>
# </>)}
# {activeSection === "content" && (<>
# </>)}
# {activeSection === "review" && (<>
# </>)}
# {activeSection === "ai" && (
# )}

# Overview
content = content.replace('{activeSection === "overview" && (<>', '')
# Keywords
content = content.replace('{activeSection === "keywords" && (', '')
# Sections
content = content.replace('{activeSection === "sections" && (', '')
# Improvements
content = content.replace('{activeSection === "improvements" && (<>', '')
# Content
content = content.replace('{activeSection === "content" && (<>', '')
# Review
content = content.replace('{activeSection === "review" && (<>', '')
# AI
content = content.replace('{activeSection === "ai" && (', '')

# Now for the closing tags. These are harder because they are generic `)}` or `</>)}`.
# I will use a regex to replace `</>)}` if it sits on its own line
content = re.sub(r'^[ \t]*</>\)}[ \t]*\n', '', content, flags=re.MULTILINE)

# And for `)}` that might close the other sections (keywords, sections, ai)
# Keywords end:
#                                         </div>
#                                     </div>
#                                 )}
# I will use exact string replacements for those specific closing tags since I know where they are.
# Wait, I can just use a regex for `)}` that are at specific indentation levels, but it's risky.
# Let's just replace the exact lines based on what we know.


content = content.replace("                                    </div>\n                                )}", "                                    </div>\n")
content = content.replace("                                        </div>\n                                    )}", "                                        </div>\n")

# For the AI section which ends at the very end of the content area:
# The AI section closing is just `)}` right before `</div>` (the content area div)
content = content.replace("                                        </div>\n                                    )}", "                                        </div>\n")

# Wait, `)}` might be used in other places like `.map(tab => ( ... ))` but I already removed the sidebar!
# Let's just use regex for `)}` on lines that have exactly 32 spaces.
content = re.sub(r"^ {32}\)}\n", "", content, flags=re.MULTILINE)

# Write back
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Refactored!")

