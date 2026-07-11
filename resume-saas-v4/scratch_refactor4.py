
import re

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove activeSection state
text = re.sub(r'[ \t]*const \[activeSection, setActiveSection\] = useState\("overview"\);\n', '', text)

# 2. Replace the start of the result section
# From <div className="flex gap-6"> to the start of the OVERVIEW Section
# We also need to define the SectionHeader component at the top of the file, outside the default export.
# Let's put it right after the imports.
section_header_code = """
const SectionHeader = ({ number, title }: { number: number, title: string }) => (
    <div className="flex items-center justify-between mb-4 mt-8">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] text-white flex items-center justify-center font-bold text-sm shadow-md">
                {number}
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">{title}</h3>
        </div>
        <button className="text-[#6366f1] text-xs font-semibold hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 transition-colors">
            View Details
        </button>
    </div>
);
"""
# insert after imports
text = text.replace("import { CustomDialog } from \"@/components/ui/CustomDialog\";\n", "import { CustomDialog } from \"@/components/ui/CustomDialog\";\n" + section_header_code)

# Now replace the layout
sidebar_start = '<div className="flex gap-6">'
overview_start = '{/* -- OVERVIEW Section -- */}'
idx_start = text.find(sidebar_start)
idx_overview = text.find(overview_start, idx_start)

if idx_start != -1 and idx_overview != -1:
    new_layout_start = """<div className="w-full max-w-6xl mx-auto flex flex-col space-y-8 pb-12 pt-4">
                                {/* -- Top Section -- */}
                                
"""
    text = text[:idx_start] + new_layout_start + text[idx_overview + len(overview_start):]

# Now let's replace the section wrappers.
# 1. Overview
text = text.replace('{activeSection === "overview" && (<>', '')
# We need to remove the closing tags of Overview.
# Let's just use exact regexes for the closing tags.
text = re.sub(r'[ \t]*</div>\n[ \t]*\)}\n[ \t]*</>\)}\n', '                                        </div>\n', text, count=1)

# Wait, this regex is a bit risky. I will do exact string replacements by printing the exact text in the file.

